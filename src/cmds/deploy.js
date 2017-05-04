'use strict';
const prompt = require('prompt');
const request = require('request');
const path = require('path');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const readPkg = require('read-pkg');
const zip = require('deterministic-zip');
const sha1Sync = require('deterministic-sha1');
const fs = require('fs-promise');
const auth = require('../auth');
const notice = require('../lib/notice');
const config = require('../config.json');
const assertPkg = require('../lib/package-json').assert;

const tmpDir = '/tmp/';

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';
const BUCKET_NAME = config.S3.deployBucket;

const sha1Dir = (source_dir) => {
    return sha1Sync(path.join(process.cwd(), source_dir)).substring(0, 8);
};

const sha1 = (s) => {
    return crypto.createHash('sha1').update(s).digest('hex');
};

const deployKey = (code_id, site_name, settings) => {
    const settings_id = sha1(JSON.stringify(settings));
    return sha1(`${code_id}.${site_name}.${settings_id}`).substr(0, 8);
};

const createZipfile = (temp_dir, source_dir, site_name, opts) => new Promise((resolve, reject) => {
    const options = opts || {cwd: process.cwd()};
    const cwd = options.cwd;
    const localdir = path.join(cwd, source_dir);
    const zipfile = path.join(temp_dir, site_name + '.zip');

    // Check whether the directory actually exists
    fs.stat(options.cwd, (err, stats) => {
        if (err) return reject(err);

        // Create zipfile from directory
        zip(localdir, zipfile, options, err => {
            if (err) return reject(err);
            else return resolve(zipfile);
        })
    });
});

const createKey = (user_id, sha1, site_name) => {
    return `${user_id}/${site_name}-${sha1}.zip`;
};

const uploadZipfile = (description, sha1, auth, site_name, zipfile) => new Promise((resolve, reject) => {
    AWS.config = new AWS.Config({
        credentials: auth.aws.credentials,
        signatureVersion: 'v4',
        region: 'eu-central-1'
    });
    const s3 = new AWS.S3();

    fs.readFile(zipfile)
        .then(data => {
            const user_id = auth.auth0.profile.user_id;
            return {
                Body: data,
                Bucket: BUCKET_NAME,
                Key: createKey(user_id, sha1.substring(0, 8), site_name),
                Metadata: {
                    description: description
                }
            }
        })
        .then(params => s3.putObject(params, (err, data) => {
            if (err) return reject(err);
            else return resolve(data);
        }))
        .catch(err => reject(err));
});

const getSiteSettings = () => new Promise((resolve, reject) => {
    const settingsFile = path.join(process.cwd(), 'site-settings.json');
    fs.stat(settingsFile, (err, stats) => {
        if (err) {
            return (err.code === 'ENOENT') ? resolve({}) : reject(err);
        }

        fs.readFile(settingsFile)
            .then(x => resolve(JSON.parse(x.toString())))
            .catch(err => reject(err))
    });
});

const saveSettings = (temp_dir, settings) => new Promise((resolve, reject) => {
    fs.writeJson(path.join(temp_dir, 'settings.json'), settings, err => {
        if (err) return reject(err);
        else return resolve();
    });
});

const createTempDir = () => new Promise((resolve, reject) => {
    fs.mkdtemp(`${tmpDir}linc-`, (err, folder) => {
        if (err) return reject(err);
        else return resolve(folder);
    });
});

const askCreateSite = () => new Promise((resolve, reject) => {
    console.log('This site doesn\'t yet exist.');

    let schema = {
        properties: {
            ok: {
                description: "Do you want to create a new site?",
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

const askDescription = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            description: {
                description: 'Description of this deployment:'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const createNewSite = (linc, auth_params) => new Promise((resolve, reject) => {
    if (linc.siteDescription.length === 0) linc.siteDescription = "[No description]";

    const body = {
        name: linc.siteName,
        description: linc.siteDescription,
        viewer_protocol: linc.viewerProtocol,
        domains: linc.domains
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

const checkSiteName = (siteName) => new Promise((resolve, reject) => {
    // console.log('Checking availability of name. Please wait...');

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

const checkSite = (siteName, authInfo) => new Promise((resolve, reject) => {
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
        if (response.statusCode !== 200) return reject(new Error('Invalid site to deploy. Please check your package.json.'));
        else return resolve();
    });
});

const deploy = (argv) => {
    if (argv.siteName === undefined) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    const siteName = argv.siteName;
    const source_dir = 'dist';
    const code_id = sha1Dir(source_dir);

    let deploy_key = null;
    let authParams = null;
    let tempDir = null;
    let endpoint;
    let description;

    console.log('Authorising user. Please wait...');

    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => authParams = auth_params)
        .catch(() => {
            console.log(`
Unauthorised operation. Please log in using 'linc login',
or create a new user with 'linc user create' before trying
to redeploy.`);
            process.exit(255);
        })
        .then(() => checkSiteName(siteName))
        .then(site_exists => {
            console.log('OK\n');

            if (!site_exists) {
                return askCreateSite()
                    .then(result => {
                        if (result.ok.toLowerCase().substr(0, 1) !== 'y') {
                            console.log('Aborted by user.');
                            process.exit(255);
                        }

                        return readPkg()
                            .then(pkg => createNewSite(pkg.linc, authParams))
                            .then(result => {
                                console.log(
`Site successfully created. Your site's endpoint is:

    ${result.endpoint}

Use this endpoint to create the links to your custom domains
by creating a CNAME records in your DNS settings.
`)
                            });
                    })
            }
        })
        .then(() => checkSite(siteName, authParams))
        .then(() => askDescription())
        .then(result => {
            description = result.description.trim();
            if (description.length === 0) throw new Error('No description provided. Abort.');

            console.log('Authorising deployment. Please wait...');

            return auth(argv.accessKey, argv.secretKey)
                .then(auth_params => {
                    authParams = auth_params;
                    return checkSite(siteName, authParams);
                })
        })
        .then(() => {
            console.log('OK\n');
            return createTempDir();
        })
        .then(temp_dir => {
            tempDir = temp_dir;
            return createZipfile(temp_dir, source_dir, siteName)
        })
        .then(() => getSiteSettings())
        .then(settings => {
            deploy_key = deployKey(code_id, siteName, settings);
            return saveSettings(tempDir, settings);
        })
        .then(() => createZipfile(tmpDir, '/', siteName, {cwd: tempDir}))
        .then(zipfile => {
            console.log('Upload started. Please wait...');
            return uploadZipfile(description, code_id, authParams, siteName, zipfile);
        })
        .then(() => console.log(`Done.

Your site has been deployed with the deployment key ${deploy_key}. Your site can
be reached at the following URL: 

    https://${deploy_key}-${siteName}.dk.linc-app.co

Please note that it may take a short while for this URL to become available.
As a next step, you can use your new deployment to create a new release with
'linc release'.
`))
        .catch(err => console.log(err.message));
};

exports.command = 'deploy';
exports.desc = 'Deploy a web site by uploading it to LINC';
exports.handler = (argv) => {
    assertPkg();

    notice();

    deploy(argv);
};
