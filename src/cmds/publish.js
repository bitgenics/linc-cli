const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const path = require('path');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const zip = require('deterministic-zip');
const fs = require('fs-extra');
const cred = require('../lib/cred');
const environments = require('../lib/environments');
const sites = require('../lib/sites');
const users = require('../lib/users');
const notice = require('../lib/notice');
const config = require('../config.json');
const assertPkg = require('../lib/package-json').assert;
const packageOptions = require('../lib/pkgOptions');

const TMP_DIR = '/tmp/';
const DIST_DIR = 'dist';

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;
const BUCKET_NAME = config.S3.deployBucket;

let reference;

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
 * @param credentials
 * @param siteName
 * @param zipfile
 */
const uploadZipfile = (description, codeId, credentials, siteName, zipfile) => new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
        credentials: credentials.aws,
        signatureVersion: 'v4',
        region: 'eu-central-1',
    });
    const s3 = new AWS.S3();

    const spinner = ora();
    spinner.start('Upload started.');

    reference = sha1(`${siteName}${Math.floor(new Date() / 1000).toString()}`);
    fs.readFile(zipfile)
        .then(data => ({
            Body: data,
            Bucket: BUCKET_NAME,
            Key: createKey(credentials.userId, codeId, siteName),
            Metadata: {
                description,
                reference,
            },
        }))
        .then(params => {
            let totalInKB;
            return s3.putObject(params).on('httpUploadProgress', (progress => {
                const loadedInKB = Math.floor(progress.loaded / 1024);
                totalInKB = Math.floor(progress.total / 1024);
                const progressInPct = Math.floor(((progress.loaded / progress.total) * 100));
                spinner.start(`Transfered ${loadedInKB} KB of ${totalInKB} KB  [${progressInPct}%]`);
            })).send(() => {
                spinner.succeed(`Upload finished. Total upload size: ${totalInKB} KB.`);
                return resolve();
            });
        })
        .catch(err => reject(err));
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
    console.log('It\'s benefial to provide a description for your deployment.');

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
 * Actually publish the site (upload to S3, let backend take it from there).
 * @param siteName
 * @param credentials
 */
const publishSite = (siteName, credentials) => new Promise((resolve, reject) => {
    const rendererPath = `${process.cwd()}/dist/lib/server-render.js`;
    const renderer = fs.readFileSync(rendererPath);
    const codeId = sha1(renderer);

    let tempDir;
    let description;

    return askDescription('')
        .then(result => {
            // eslint-disable-next-line prefer-destructuring
            description = result.description;
            return createTempDir();
        })
        .then(tmp => {
            tempDir = tmp;
            // Zip the dist directory
            return createZipfile(tempDir, DIST_DIR, siteName);
        })
        // Create "meta" zip-file containing package.json and <siteName>.zip
        .then(() => createZipfile(TMP_DIR, '/', siteName, { cwd: tempDir }))
        .then(zipfile => uploadZipfile(description, codeId, credentials, siteName, zipfile))
        .then(() => resolve())
        .catch(err => reject(err));
});

/**
 * Retrieve deployment status using reference
 * @param siteName
 * @param jwtToken
 */
const retrieveDeploymentStatus = (siteName, jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/deployments/${reference}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
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
 * @param authInfo
 */
const waitForDeployToFinish = (envs, siteName, authInfo) => new Promise((resolve, reject) => {
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
            () => {
                retrieveDeploymentStatus(siteName, authInfo)
                    .then(s => {
                        if (s.length === envs.length) return resolve(s);

                        Timeout = 8;
                        return checkForDeployToFinish(count - 1);
                    })
                    .catch(err => reject(err));
            },
            Timeout * 1000,
        );
    };

    // Start the checking
    return checkForDeployToFinish(Count);
});

/**
 * Main entry point for this module.
 */
const publish = () => {
    let credentials;
    let jwtToken;
    let packageJson;
    let siteName;
    let listOfEnvironments;

    // Disappearing progress messages
    const spinner = ora();

    cred.load()
        .catch(() => {
            console.log('It looks like you haven\'t signed up for this site yet.');
            return users.signup();
        })
        .then(() => packageOptions(['siteName', 'buildProfile']))
        .then(pkg => {
            packageJson = pkg;

            // eslint-disable-next-line prefer-destructuring
            siteName = packageJson.linc.siteName;

            spinner.start('Performing checks. Please wait...');
            sites.authoriseSite(siteName);
        })
        .then(() => environments.getAvailableEnvironments(siteName))
        .then(envs => {
            spinner.stop();

            listOfEnvironments = envs.environments.map(x => x.name);
            return publishSite(siteName, credentials);
        })
        .then(() => {
            spinner.start('Waiting for deploy to finish...');

            return waitForDeployToFinish(listOfEnvironments, siteName, jwtToken);
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
exports.handler = () => {
    assertPkg();

    notice();

    publish();
};
