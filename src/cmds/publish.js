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
const notice = require('../lib/notice');
const config = require('../config.json');
const assertPkg = require('../lib/package-json').assert;

const TMP_DIR = '/tmp/';
const DIST_DIR = 'dist';

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';
const BUCKET_NAME = config.S3.deployBucket;

/**
 * Convenience function to create SHA1 of a string
 * @param s
 */
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

/**
 * Create deployment key, which is basically a SHA1
 * @param code_id
 * @param site_name
 * @param settings
 * @returns {string}
 */
const calculateDeployKey = (code_id, site_name, settings) => {
    const settings_id = sha1(JSON.stringify(settings));
    return sha1(`${code_id}.${site_name}.${settings_id}`).substr(0, 8);
};

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
 * @param deployKey
 * @param sha1
 * @param site_name
 */
const createKey = (user_id, deployKey, sha1, site_name) => (
    `${user_id}/${deployKey}/${site_name}-${sha1}.zip`
);

/**
 * Upload zip file to S3.
 * @param description
 * @param deployKey
 * @param codeId
 * @param auth
 * @param site_name
 * @param zipfile
 * @param env
 */
const uploadZipfile = (description, deployKey, codeId, auth, site_name, zipfile, env) => new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
        credentials: auth.aws.credentials,
        signatureVersion: 'v4',
        region: 'eu-central-1'
    });
    const s3 = new AWS.S3();

    const spinner = ora();

    fsPromise.readFile(zipfile)
        .then(data => {
            const user_id = auth.auth0.profile.user_id;
            return {
                Body: data,
                Bucket: BUCKET_NAME,
                Key: createKey(user_id, deployKey, codeId, site_name),
                Metadata: {
                    description: description,
                    environment: env || 'prod',
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
 * Get site settings from site-settings.json file.
 */
const getSiteSettings = () => new Promise((resolve, reject) => {
    const settingsFile = path.join(process.cwd(), 'site-settings.json');
    fsPromise.stat(settingsFile, (err, stats) => {
        if (err) {
            return (err.code === 'ENOENT') ? resolve({}) : reject(err);
        }

        fsPromise.readFile(settingsFile)
            .then(x => resolve(JSON.parse(x.toString())))
            .catch(err => reject(err))
    });
});

/**
 * Save a JSON object into a JSON file.
 * @param temp_dir
 * @param json
 * @param filename
 */
const saveJSONFile = (temp_dir, json, filename) => new Promise((resolve, reject) => {
    fsPromise.writeJson(path.join(temp_dir, filename), json, err => {
        if (err) return reject(err);
        else return resolve();
    });
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
 * @param environment
 */
const publishSite = (packageJson, authParams, environment) => new Promise((resolve, reject) => {
    const siteName = packageJson.linc.siteName;
    const rendererPath = `${process.cwd()}/dist/lib/server-render.js`;
    const renderer = fs.readFileSync(rendererPath);
    const codeId = sha1(renderer);

    let tempDir;
    let deployKey;
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
        .then(() => getSiteSettings())
        .then(settings => {
            deployKey = calculateDeployKey(codeId, siteName, settings);
            // Save the site settings into the temporary directory as JSON file
            return saveJSONFile(tempDir, settings, 'settings.json');
        })
        // Create "meta" zip-file containing package.json, settings.json and <siteName>.zip
        .then(() => createZipfile(TMP_DIR, '/', siteName, {cwd: tempDir}))
        .then(zipfile => uploadZipfile(description, deployKey, codeId, authParams, siteName, zipfile, environment))
        .then(() => resolve(deployKey))
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
 * Main entry point for this module.
 * @param argv
 */
const publish = (argv) => {
    let authParams;
    let packageJson;
    let environment = 'prod';
    if (argv.s) {
        if (typeof argv.s !== 'string') {
            console.log('Oops: you failed to provide an environment name with the flag -s.');
            process.exit(255);
        }
        environment = argv.s;
    }

    // Disappearing progress messages
    const spinner = ora('Authorising user. Please wait...').start();

    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => authParams = auth_params)
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
                return initSite(packageJson, authParams);
            }

            spinner.text = 'Performing checks. Please wait...';
            spinner.start();
        })
        .then(() => authoriseSite(packageJson.linc.siteName, authParams))
        .then(() => {
            spinner.stop();
            return publishSite(packageJson, authParams, environment);
        })
        .then(deployKey => console.log(`
Your site has been published with the key ${deployKey} and can be reached 
at the following URLs: 

    https://${deployKey}-${packageJson.linc.siteName}.dk.linc-app.co
    https://${packageJson.linc.siteName}.linc-app.co
    
Please note that it may take a short while for these URLs to become available.
`))
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
