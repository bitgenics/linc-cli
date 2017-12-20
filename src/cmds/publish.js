'use strict';
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const AWS = require('aws-sdk');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const zip = require('deterministic-zip');
const fsPromise = require('fs-promise');
const auth = require('../auth');
const domainify = require('../lib/domainify');
const environments = require('../lib/environments');
const notice = require('../lib/notice');
const config = require('../config.json');
const assertPkg = require('../lib/package-json').assert;

const TMP_DIR = '/tmp/';
const DIST_DIR = 'dist';

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';
const BUCKET_NAME = config.S3.deployBucket;

let reference;

/**
 * Convenience function to create SHA1 of a string
 * @param s
 */
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

/**
 * Create a zip file from a source_dir, named <site_name>.zip
 * @param temp_dir
 * @param source_dir
 * @param site_name
 * @param opts
 */
const createZipfile = (temp_dir, source_dir, site_name, opts) => new Promise((resolve, reject) => {
    const options = opts || {cwd: process.cwd()};
    const cwd = options.cwd;
    const localdir = path.join(cwd, source_dir);
    const zipfile = path.join(temp_dir, site_name + '.zip');

    // Check whether the directory actually exists
    fsPromise.stat(options.cwd, (err, stats) => {
        if (err) return reject(err);

        // Create zipfile from directory
        zip(localdir, zipfile, options, err => {
            if (err) return reject(err);
            else return resolve(zipfile);
        })
    });
});

/**
 * Create key for S3.
 * @param user_id
 * @param sha1
 * @param site_name
 */
const createKey = (user_id, sha1, site_name) => (
    `${user_id}/${site_name}-${sha1}.zip`
);

/**
 * Upload zip file to S3.
 * @param description
 * @param codeId
 * @param auth
 * @param site_name
 * @param zipfile
 */
const uploadZipfile = (description, codeId, auth, site_name, zipfile) => new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
        credentials: auth.aws.credentials,
        signatureVersion: 'v4',
        region: 'eu-central-1'
    });
    const s3 = new AWS.S3();

    const spinner = ora();
    spinner.start('Upload started.');

    reference = sha1(`${site_name}${Math.floor(new Date()/1000).toString()}`);
    fsPromise.readFile(zipfile)
        .then(data => {
            const user_id = auth.auth0.profile.user_id;
            return {
                Body: data,
                Bucket: BUCKET_NAME,
                Key: createKey(user_id, codeId, site_name),
                Metadata: {
                    description: description,
                    reference,
                }
            }
        })
        .then(params => {
            let totalInKB;
            return s3.putObject(params).on('httpUploadProgress', (progress => {
                const loadedInKB = Math.floor(progress.loaded / 1024);
                totalInKB = Math.floor(progress.total / 1024);
                const progressInPct = Math.floor((progress.loaded / progress.total * 100));
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
    fsPromise.mkdtemp(`${TMP_DIR}linc-`, (err, folder) => {
        if (err) return reject(err);
        else return resolve(folder);
    });
});

/**
 * Ask user for site name.
 * @param name
 */
const askSiteName = (name) => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Pattern AWS uses for host names.
                pattern: /^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/,
                default: name,
                description: 'Name of site to create:',
                message: 'Only a-z, 0-9 and - are allowed characters. Cannot start/end with -.',
                required: true
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

/**
 * Ask user for a publication description.
 * @param descr
 */
const askDescription = (descr) => new Promise((resolve, reject) => {
    console.log(`It's benefial to provide a description for your deployment.`);

    let schema = {
        properties: {
            description: {
                description: 'Description:',
                default: descr,
                required: false
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

/**
 * Are you sure? :)
 */
const askIsThisOk = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            ok: {
                description: "Is this OK?",
                default: 'Y',
                type: 'string'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    });
});

/**
 * Create a new site in the backend.
 * @param siteName
 * @param auth_params
 */
const createNewSite = (siteName, auth_params) => new Promise((resolve, reject) => {
    const body = {
        name: siteName
    };
    const options = {
        method: 'POST',
        url: LINC_API_SITES_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth_params.jwtToken}`
        },
        body: JSON.stringify(body)
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        else if (response.statusCode !== 200) return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        else return resolve(json);
    });
});

/**
 * Check whether a site name already exists.
 * @param siteName
 */
const checkSiteName = (siteName) => new Promise((resolve, reject) => {
    console.log('Checking availability of name. Please wait...');

    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/exists`,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (response.statusCode === 200) return resolve(json.exists);
        else return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
    });
});

/**
 * Authorise the user.
 * @param siteName
 * @param authInfo
 */
const authoriseSite = (siteName, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        }
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(new Error('Unauthorised access or invalid site.'));
        else return resolve();
    });
});

/**
 * Actually publish the site (upload to S3, let backend take it from there).
 * @param packageJson
 * @param authParams
 */
const publishSite = (packageJson, authParams) => new Promise((resolve, reject) => {
    const siteName = packageJson.linc.siteName;
    const rendererPath = `${process.cwd()}/dist/lib/server-render.js`;
    const renderer = fs.readFileSync(rendererPath);
    const codeId = sha1(renderer);

    let tempDir;
    let description;

    return askDescription('')
        .then(result => {
            description = result.description;
            return createTempDir();
        })
        .then(temp_dir => {
            tempDir = temp_dir;
            // Zip the dist directory
            return createZipfile(tempDir, DIST_DIR, siteName);
        })
        // Create "meta" zip-file containing package.json and <siteName>.zip
        .then(() => createZipfile(TMP_DIR, '/', siteName, {cwd: tempDir}))
        .then(zipfile => uploadZipfile(description, codeId, authParams, siteName, zipfile))
        .then(() => resolve())
        .catch(err => reject(err));
});

/**
 * Initialise site.
 * @param packageJson
 * @param authParams
 */
const initSite = (packageJson, authParams) => new Promise((resolve, reject) => {
    const linc = packageJson.linc;

    console.log(`It looks like you haven't provided a site name yet,
so let's handle that now.
`);
    askSiteName(domainify(packageJson.name))
        .then(result => {
            linc.siteName = result.site_name;
            return checkSiteName(linc.siteName)
        })
        .then(exists => {
            if (exists) {
                throw new Error('This site name already exists.');
            }

            console.log(`The following section will be updated in package.json:
${JSON.stringify({linc: linc}, null, 3)}
`);
            return askIsThisOk();
        })
        .then(result => {
            if (result.ok.toLowerCase().substr(0, 1) !== 'y') {
                console.log('Aborted by user.');
                process.exit(255);
            }

            return createNewSite(linc.siteName, authParams)
                .then(result => console.log(`Site successfully created.
Now let's publish your site.`));
        })
        .then(() => writePkg(packageJson))
        .then(() => resolve())
        .catch(err => reject(err));
});

/**
 * Retrieve deployment status using reference
 * @param siteName
 * @param authInfo
 */
const retrieveDeploymentStatus = (siteName, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/deployments/${reference}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        }
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
    const Timeout = 6;

    /**
     * Check whether deploy has finished
     * @param count
     */
    const checkForDeployToFinish = (count) => {
        if (count === 0) {
            return reject(new Error('The process timed out'));
        }

        return setTimeout(() => {
            retrieveDeploymentStatus(siteName, authInfo)
                .then(s => {
                    if (s.length === envs.length) return resolve(s);

                    return checkForDeployToFinish(count - 1);
                })
                .catch(err => reject(err));
        },
        Timeout * 1000);
    };

    // Start the checking
    return checkForDeployToFinish(Count);
});

/**
 * Main entry point for this module.
 * @param argv
 */
const publish = (argv) => {
    let authInfo;
    let packageJson;
    let siteName;
    let listOfEnvironments;

    // Disappearing progress messages
    const spinner = ora('Authorising user. Please wait...').start();

    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => authInfo = auth_params)
        .catch(err => {
            spinner.stop();

            console.log(`
${err.message}

Please log in using 'linc login', or create a new user with 
'linc user create' before trying to publish. 

If you created a user earlier, make sure to verify your email 
address. You cannot use LINC with an email address that is 
unverified.

If the error message doesn't make sense to you, please contact
us using the email address shown above. 
`);
            process.exit(255);
        })
        .then(() => {
            spinner.stop();

            return readPkg();
        })
        .then(pkg => {
            packageJson = pkg;
            const linc = packageJson.linc;
            if (!linc || !linc.buildProfile || !linc.sourceDir) {
                throw new Error('This project is not initialised. Did you forget to \'linc init\'?');
            }
            if (!linc.siteName) {
                return initSite(packageJson, authInfo);
            }

            spinner.start('Performing checks. Please wait...');
        })
        .then(() => {
            siteName = argv.siteName || packageJson.linc.siteName;

            return authoriseSite(siteName, authInfo);
        })
        .then(() => environments.getAvailableEnvironments(argv.siteName, authInfo))
        .then(envs => {
            spinner.stop();

            listOfEnvironments = envs.environments.map(x => x.name);

            return publishSite(packageJson, authInfo);
        })
        .then(() => {
            spinner.start('Waiting for deploy to finish...');

            return waitForDeployToFinish(listOfEnvironments, siteName, authInfo);
        })
        .then(envs => {
            spinner.succeed('Deployment finished');

            console.log('\nThe following deploy URLs were created:')
            envs.forEach(e => {
                console.log(`  https://${e.url}  (${e.env})`);
                if (e.env === 'prod') {
                    console.log(`  https://${siteName}.linc-app.co  (${e.env})`)
                }
            });
        })
        .catch(err => {
            spinner.stop();
            console.log(err.message)
        });
};

exports.command = ['publish', 'deploy'];
exports.desc = 'Publish your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    publish(argv);
};
