const AWS = require('aws-sdk');
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const path = require('path');
const crypto = require('crypto');
const zip = require('deterministic-zip');
const fs = require('fs-extra');
const auth = require('../lib/auth');
const authorisify = require('../lib/authorisify');
const loadCredentials = require('../lib/cred').load;
const environments = require('../lib/environments');
const sites = require('../lib/sites');
const users = require('../lib/users');
const notice = require('../lib/notice');
const config = require('../config/config.json');
const assertPkg = require('../lib/package-json').assert;
const packageOptions = require('../lib/pkgOptions');

const TMP_DIR = '/tmp/';
const DIST_DIR = 'dist';

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;
const BUCKET_NAME = config.S3.deployBucket;

const IdentityPoolId = 'eu-central-1:a05922c7-303d-4b8c-9843-60f5e590a812';

let reference;

const spinner = ora();

// Some progress message for publishing process
const messages = [
    'Preparing upload.',
    'Creating upload package.',
    'Authorising.',
    'Uploading package.',
];
const msgStart = (n) => spinner.start(`${messages[n]} Please wait...`);
const msgSucceed = (n) => spinner.succeed(`${messages[n]} Done.`);

/**
 * Convenience function to create SHA1 of a string
 * @param s
 */
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

/**
 * Create a zip file from a source_dir, named <site_name>.zip
 * @param tempDir
 * @param sourceDir
 * @param siteName
 * @param opts
 */
const createZipfile = (tempDir, sourceDir, siteName, opts) => new Promise((resolve, reject) => {
    const options = opts || { cwd: process.cwd() };
    const { cwd } = options;
    const localdir = path.join(cwd, sourceDir);
    const zipfile = path.join(tempDir, `${siteName}.zip`);

    // Check whether the directory actually exists
    fs.stat(options.cwd, (err) => {
        if (err) return reject(err);

        // Create zipfile from directory
        return zip(localdir, zipfile, options, _err => {
            if (_err) return reject(_err);

            return resolve(zipfile);
        });
    });
});

/**
 * Create key for S3.
 * @param userId
 * @param _sha1
 * @param siteName
 */
const createKey = (userId, _sha1, siteName) => `${userId}/${siteName}-${_sha1}.zip`;

/**
 * Upload zip file to S3.
 * @param description
 * @param codeId
 * @param siteName
 * @param zipfile
 * @param jwtToken
 */
const uploadZipfile = (description, codeId, siteName, zipfile, jwtToken) => new Promise((resolve, reject) => {
    reference = sha1(`${siteName}${Math.floor(new Date() / 1000).toString()}`);
    const key = createKey(AWS.config.credentials.identityId, codeId, siteName);

    msgSucceed(2);
    const stream = fs.createReadStream(zipfile);
    const params = {
        Body: stream,
        Bucket: BUCKET_NAME,
        Key: key,
        Metadata: {
            description,
            reference,
            jwt: jwtToken,
        },
    };

    msgStart(3);
    const upload = new AWS.S3.ManagedUpload({ params });
    upload.on('httpUploadProgress', (progress) => {
        const loadedInKB = Math.floor(progress.loaded / 1024);
        spinner.start(`Uploading ${loadedInKB} KB. Please wait...`);
    });
    return upload.send((err) => {
        if (err) {
            spinner.fail('Upload failed.');
            return reject(err);
        }

        msgSucceed(3);
        return resolve();
    });
});

/**
 * Create a temporary directory using global TMP_DIR.
 */
const createTempDir = () => new Promise((resolve, reject) => {
    fs.mkdtemp(`${TMP_DIR}linc-`, (err, folder) => {
        if (err) return reject(err);

        return resolve(folder);
    });
});

/**
 * Ask user for a publication description.
 * @param descr
 */
const askDescription = (descr) => new Promise((resolve, reject) => {
    console.log('It\'s beneficial to provide a description for your deployment.');

    const schema = {
        properties: {
            description: {
                description: 'Description:',
                default: descr,
                required: false,
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result);
    });
});

/**
 * Get credentials
 * @param token
 */
const getCredentials = (token) => new Promise((resolve, reject) => {
    AWS.config.region = 'eu-central-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId,
        Logins: {
            'cognito-idp.eu-central-1.amazonaws.com/eu-central-1_fLLmXhVcs': token,
        },
    });
    return AWS.config.credentials.get((err) => {
        if (err) return reject(err);

        return resolve();
    });
});

/**
 * Actually publish the site (upload to S3, let backend take it from there).
 * @param siteName
 * @param description
 * @param credentials
 */
const publishSite = (siteName, description, credentials) => new Promise((resolve, reject) => {
    const rendererPath = `${process.cwd()}/dist/lib/server-render.js`;
    const renderer = fs.readFileSync(rendererPath);
    const codeId = sha1(renderer);

    let zipFile;
    let tempDir;
    let jwtToken;

    msgSucceed(0);
    msgStart(1);
    createTempDir()
        .then(tmp => {
            tempDir = tmp;
            // Zip the dist directory
            return createZipfile(tempDir, DIST_DIR, siteName);
        })
        .then(() => createZipfile(TMP_DIR, '/', siteName, { cwd: tempDir }))
        .then(zipfile => {
            zipFile = zipfile;
            msgSucceed(1);
            msgStart(2);
            return auth(credentials.accessKey, credentials.secretKey);
        })
        .then(token => {
            jwtToken = token;
            return auth.getIdToken();
        })
        .then(token => getCredentials(token))
        .then(() => uploadZipfile(description, codeId, siteName, zipFile, jwtToken))
        .then(resolve)
        .catch(err => {
            spinner.stop();

            return reject(err);
        });
});

/**
 * Retrieve deployment status using reference
 * @param siteName
 */
const retrieveDeploymentStatus = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/deployments/${reference}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (response.statusCode === 200) return resolve(json.statuses);

        return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
    });
});

/**
 * Wait for deploy to finish (or to time out - timeout is set to three minutes)
 * @param envs
 * @param siteName
 */
const waitForDeployToFinish = (envs, siteName) => new Promise((resolve, reject) => {
    const Count = 20;
    let Timeout = 4;

    /**
     * Check whether deploy has finished
     * @param count
     */
    const checkForDeployToFinish = (count) => {
        if (count === 0) {
            return reject(new Error('The process timed out'));
        }

        return setTimeout(
            () => authorisify(retrieveDeploymentStatus(siteName))
                .then(s => {
                    if (s.length === envs.length) return resolve(s);

                    Timeout = 8;
                    return checkForDeployToFinish(count - 1);
                })
                .catch(err => reject(err)),
            Timeout * 1000 // eslint-disable-line comma-dangle
        );
    };

    // Start the checking
    return checkForDeployToFinish(Count);
});

/**
 * Main entry point for this module.
 */
const publish = (argv) => {
    let credentials;
    let description;
    let packageJson;
    let siteName;
    let listOfEnvironments;

    loadCredentials()
        .then(creds => credentials = creds) // eslint-disable-line no-return-assign
        .catch(() => {
            console.log(`It looks like you haven't signed up for this site yet.
If this is an existing LINC site, please make sure to enter
the email address you used to create this site.`);

            return users.signup(argv.siteName);
        })
        .then(() => packageOptions(['siteName', 'buildProfile']))
        .then(pkg => {
            packageJson = pkg;

            // eslint-disable-next-line prefer-destructuring
            siteName = packageJson.linc.siteName;

            return askDescription('');
        })
        .then(result => {
            console.log();

            // eslint-disable-next-line prefer-destructuring
            description = result.description;

            msgStart(0);
            return sites.authoriseSite(siteName);
        })
        .then(() => environments.getAvailableEnvironments(siteName))
        .then(envs => {
            spinner.stop();

            listOfEnvironments = envs.environments.map(x => x.name);
            return publishSite(siteName, description, credentials);
        })
        .then(() => {
            spinner.start('Waiting for deploy to finish...');

            return waitForDeployToFinish(listOfEnvironments, siteName);
        })
        .then(envs => {
            spinner.succeed('Deployment finished');

            console.log('\nThe following deploy URLs were created:');
            envs.forEach(e => console.log(`  https://${e.url}  (${e.env})`));
        })
        .catch(err => {
            spinner.stop();
            console.log(err.message ? err.message : err);
        });
};

exports.command = ['publish', 'deploy'];
exports.desc = 'Publish your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    publish(argv);
};
