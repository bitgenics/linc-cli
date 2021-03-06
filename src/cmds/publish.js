const AWS = require('aws-sdk');
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const path = require('path');
const crypto = require('crypto');
const zip = require('deterministic-zip');
const fs = require('fs-extra');
const auth = require('../lib/auth');
const backupCredentials = require('../lib/cred').backup;
const loadCredentials = require('../lib/cred').load;
const { removeToken } = require('../lib/cred');
const saveCredentials = require('../lib/cred').save;
const authorisify = require('../lib/authorisify');
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

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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
const msgSucceed = (n, m) => {
    spinner.succeed(`${messages[n]} Done.`);
    if (m) msgStart(m);
};

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

    msgSucceed(2, 3);

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
 * Actually upload the site (upload to S3, let backend take it from there).
 * @param siteName
 * @param description
 * @param credentials
 */
const uploadSite = async (siteName, description, credentials) => {
    const rendererPath = `${process.cwd()}/dist/lib/server-render.js`;
    const renderer = fs.readFileSync(rendererPath);
    const codeId = sha1(renderer);

    msgSucceed(0, 1);

    const tempDir = fs.mkdtempSync(`${TMP_DIR}linc-`);

    await createZipfile(tempDir, DIST_DIR, siteName);
    const zipFile = await createZipfile(TMP_DIR, '/', siteName, { cwd: tempDir });

    msgSucceed(1, 2);

    const jwtToken = await auth(credentials.accessKey, credentials.secretKey);
    const token = await auth.getIdToken();
    await getCredentials(token);
    return uploadZipfile(description, codeId, siteName, zipFile, jwtToken);
};

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
 * Publish site
 */
const publishSite = async (credentials, siteName) => {
    spinner.start('Checking for profile package. Please wait...');
    await packageOptions(['buildProfile']);
    spinner.succeed('Profile package installed.');

    const { description } = await askDescription('');
    console.log();

    msgStart(0);
    await sites.authoriseSite(siteName);

    let envs = await environments.getAvailableEnvironments(siteName);
    const listOfEnvironments = envs.environments.map(x => x.name);

    await uploadSite(siteName, description, credentials);
    envs = await waitForDeployToFinish(listOfEnvironments, siteName);
    spinner.succeed('Deployment finished');

    console.log('\nThe following deploy URLs were created:');
    envs.forEach(e => console.log(`  https://${e.url}  (${e.env})`));
};

/**
 * Copy existing .linc/credentials to .linc/credentials.bak
 */
const moveCredentials = async () => {
    console.log(`I found credentials in this folder, but no siteName.
As a precaution, I have moved your existing credentials:

  .linc/credentials.bak -> .linc/credentials.
`);

    await backupCredentials();
    await removeToken();
};

/**
 * Ask for user credentials
 */
const credentialsFromPrompt = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            access_key_id: {
                description: 'Access key:',
                required: true,
            },
            secret_access_key: {
                description: 'Secret key:',
                hidden: true,
            },
        },
    };

    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve({
            access_key_id: result.access_key_id,
            secret_access_key: result.secret_access_key,
        });
    });
});

/**
 * Log in user
 */
const login = async () => {
    console.log(`Your site has a name, but I can't find any credentials. Please log
in by entering your access key and secret key when prompted.
`);

    const credentials = await credentialsFromPrompt();
    await auth(credentials.access_key_id, credentials.secret_access_key);
    await backupCredentials();
    return saveCredentials(credentials.access_key_id, credentials.secret_access_key);
};

/**
 * Check for existing site name in back end
 * @param siteName
 */
const existingSite = (siteName) => {
    const existingSites = [
        'bitgenics',
        'coffee-bean-ninja',
        'linc-react-games',
        'localised',
        'fysho-web',
        'geodash',
        'armory-react',
        'linc-demo-site',
        'buildkite-www-t',
        'bankwest-test',
        'fysho',
        'linc-demo',
        'jetstar-cards',
        'react-trello-board',
        'cath-github-demo',
    ];
    return existingSites.indexOf(siteName) >= 0;
};

/**
 * Main entry point for this module.
 * @param argv
 */
const publish = async (argv) => {
    const { siteName } = argv;

    let credentials = null;
    try {
        credentials = await loadCredentials();
    } catch (e) {
        // Empty block
    }

    /*
     * Existing site name
     */
    let suppressSignupMessage = false;
    if (siteName) {
        if (credentials) return publishSite(credentials, siteName);

        if (!existingSite(siteName)) {
            credentials = await login();
            return publishSite(credentials, siteName);
        }

        suppressSignupMessage = true;

        console.log(`Your existing site ${siteName} needs to be ported. Please follow 
the instructions below. Please use the same email address you used 
when you originally signed up this site.
`);
    }

    /*
     * New site name
     */
    if (credentials) {
        // No site name but credentials found? Move credentials out of the way
        await moveCredentials();
    }

    if (!suppressSignupMessage) {
        console.log(`It looks like you haven't signed up for this site yet.
Please follow the steps to create your credentials.
`);
    }

    credentials = await users.signup(siteName);
    const pkg = await packageOptions(['siteName']);
    return publishSite(credentials, pkg.linc.siteName);
};

exports.command = ['publish', 'deploy'];
exports.desc = 'Publish your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    publish(argv)
        .then(() => {})
        .catch(err => {
            spinner.stop();
            console.log(err);
        });
};
