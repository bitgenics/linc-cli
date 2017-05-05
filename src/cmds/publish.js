'use strict';
const prompt = require('prompt');
const request = require('request');
const path = require('path');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const zip = require('deterministic-zip');
const sha1Sync = require('deterministic-sha1');
const fs = require('fs-promise');
const auth = require('../auth');
const notice = require('../lib/notice');
const config = require('../config.json');
const viewerProtocols = require('../lib/viewer-protocols');
const createErrorTemplates = require('../lib/error-templates');

const assertPkg = require('../lib/package-json').assert;

const TMP_DIR = '/tmp/';
const DIST_DIR = 'dist';

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';
const BUCKET_NAME = config.S3.deployBucket;

const sha1Dir = (source_dir) => {
    return sha1Sync(path.join(process.cwd(), source_dir)).substring(0, 8);
};

const sha1 = (s) => {
    return crypto.createHash('sha1').update(s).digest('hex');
};

const calculateDeployKey = (code_id, site_name, settings) => {
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
    fs.mkdtemp(`${TMP_DIR}linc-`, (err, folder) => {
        if (err) return reject(err);
        else return resolve(folder);
    });
});

const askSiteName = (name) => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Pattern AWS uses for host names.
                pattern: /^(?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9]$/,
                default: name,
                description: 'Name of site to create:',
                message: 'Only a-z, A-Z, 0-9 and - are allowed characters. Cannot start/end with -.',
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

const askDescription = (descr) => new Promise((resolve, reject) => {
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

const askErrorPagesDir = () => new Promise((resolve, reject) => {
    console.log(`
Please provide a directory containing custom error pages (HTML).
If such a directory doesn't yet exist, we will create one for you
and populate it with example error page templates. The default 
directory for custom error pages is 'errors'.`);

    let schema = {
        properties: {
            error_dir: {
                description: 'Error pages directory:',
                required: true,
                type: 'string',
                default: 'errors'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const askViewerProtocol = () => new Promise((resolve, reject) => {
    console.log(`
Please choose the viewer protocol to use:
     A) ${viewerProtocols['A'].name} (default)
     B) ${viewerProtocols['B'].name}
     C) ${viewerProtocols['C'].name}`);

    let schema = {
        properties: {
            protocol: {
                pattern: /^(?:A|B|C|a|b|c)?$/,
                description: 'Protocol to use:',
                message: 'Please enter a valid option',
                type: 'string',
                default: 'A'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const validateDomainName = (x) => {
    const match = /^(\*\.)?(((?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9])\.)+((?!-)[A-Za-z0-9-]{1,62}[A-Za-z0-9])$/.test(x);
    if (! match) {
        console.log(`ERROR: '${x}' is not a valid domain name.`);
    }
    return match;
};

const askDomainNames = () => new Promise((resolve, reject) => {
    console.log(`
If you want, you can already add domain names for your site.
However, if you don't want to do that just yet, or if you
don't know which domain names you're going to use, you can
also add them later using the command 'linc domain add'.
Please enter domain names separated by a comma:`);
    let schema = {
        properties: {
            domains: {
                description: "Domains to add:",
                type: 'string'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        if (result.domains === '') return resolve([]);

        const domains = result.domains.split(',');
        const validated_domains = domains.map(x => x.trim()).filter(validateDomainName);
        if (domains.length !== validated_domains.length) {
            console.log('ERROR: One or more domain names are invalid and have been removed from the list.');
        }
        return resolve(validated_domains);
    })
});

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

const publishSite = (siteName, description, authParams) => new Promise((resolve, reject) => {
    const codeId = sha1Dir(DIST_DIR);

    let tempDir;
    let deployKey;

    return createTempDir()
        .then(temp_dir => {
            tempDir = temp_dir;
            return createZipfile(tempDir, DIST_DIR, siteName);
        })
        .then(() => getSiteSettings())
        .then(settings => {
            deployKey = calculateDeployKey(codeId, siteName, settings);
            return saveSettings(tempDir, settings);
        })
        .then(() => createZipfile(TMP_DIR, '/', siteName, {cwd: tempDir}))
        .then(zipfile => {
            console.log('Upload started. Please wait...');
            return uploadZipfile(description, codeId, authParams, siteName, zipfile);
        })
        .then(() => resolve(deployKey))
        .catch(err => reject(err));
});

const initSite = (packageJson, authParams) => new Promise((resolve, reject) => {
    const linc = packageJson.linc;

    askSiteName(packageJson.name)
        .then(result => {
            const siteName = result.site_name;
            return checkSiteName(siteName)
                .then(exists => {
                    if (exists) {
                        console.log('This site name already exists. Abort.');
                        process.exit(255);
                    } else {
                        console.log('OK');
                        linc.siteName = siteName;
                        return askDescription(packageJson.description);
                    }
                });
        })
        .then(result => {
            linc.siteDescription = result.description;
            return askErrorPagesDir();
        })
        .then(result => {
            linc.errorDir = result.error_dir;
            return askViewerProtocol();
        })
        .then(result => {
            linc.viewerProtocol = viewerProtocols[result.protocol].policy;
            return askDomainNames();
        })
        .then(results => {
            linc.domains = results;
            let domainStr = '';
            linc.domains.forEach(x => domainStr += '\n  - ' + x);
            console.log(`
The following section will be updated in package.json:
${JSON.stringify({linc: linc}, null, 3)}
`);
            return askIsThisOk();
        })
        .then(result => {
            if (result.ok.toLowerCase().substr(0, 1) !== 'y') {
                console.log('Aborted by user.');
                process.exit(255);
            }

            return createNewSite(linc, authParams)
                .then(result => {
                    console.log(
                        `Site successfully created. Your site's endpoint is:

    ${result.endpoint}

Use this endpoint to create the links to your custom domains
by creating a CNAME records in your DNS settings.
`)
                });
        })
        .then(() => {
            console.log('Creating the error page templates.');
            return createErrorTemplates(process.cwd());
        })
        .then(() => writePkg(packageJson))
        .then(() => resolve())
        .catch(err => reject(err));
});

const publish = (argv) => {
    let authParams;
    let packageJson;

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
        .then(() => readPkg())
        .then(pkg => {
            packageJson = pkg;
            const linc = packageJson.linc;
            if (!linc || !linc.buildProfile || !linc.sourceDir) {
                throw new Error('This project is not initialised. Did you forget to \'linc init\'?');
            }
            if (!linc.siteName) return initSite(packageJson, authParams);
        })
        .then(() => authoriseSite(packageJson.linc.siteName, authParams))
        .then(() => publishSite(packageJson.linc.siteName, packageJson.linc.siteDescription, authParams))
        .then(deployKey => console.log(`Done.

Your site has been published with the key ${deployKey} and can be reached 
shortly at the following URL: 

    https://${deployKey}-${packageJson.linc.siteName}.dk.linc-app.co

Please note that it may take a short while for this URL to become available.

As a next step, you can create a new release with 'linc release' and make it
available from your custom domain(s).
`))
        .catch(err => console.log(err.message));
};

exports.command = 'publish';
exports.desc = 'Publish a web site by uploading it to LINC';
exports.handler = (argv) => {
    assertPkg();

    notice();

    publish(argv);
};
