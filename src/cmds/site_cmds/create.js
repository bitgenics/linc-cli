'use strict';
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const notice = require('../../lib/notice');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const config = require('../../config.json');
const domainify = require('../../lib/domainify');
const viewerProtocols = require('../../lib/viewer-protocols');
const createErrorTemplates = require('../../lib/error-templates');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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

const askDescription = (descr) => new Promise((resolve, reject) => {
    console.log(`
Please provide a description for your site.`);

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
    const match = /^(\*\.)?(((?!-)[a-z0-9-]{0,62}[a-z0-9])\.)+((?!-)[a-z0-9-]{1,62}[a-z0-9])$/.test(x);
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

const createNewSite = (linc, auth_params, method) => new Promise((resolve, reject) => {
    const body = {
        name: linc.siteName,
        settings: {
            description: linc.description,
            viewer_protocol: linc.viewer_protocol,
            domains: linc.domains
        }
    };
    const options = {
        method: (method === 'CREATE') ? 'POST' : 'PUT',
        url: LINC_API_SITES_ENDPOINT + (method === 'UPDATE' ? `/${linc.siteName}` : ''),
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

const initSite = (packageJson, authParams) => new Promise((resolve, reject) => {
    const siteName = packageJson.linc.siteName;

    const linc = {};
    let p;
    if (siteName !== undefined) {
        linc.siteName = siteName;
        p = Promise.resolve();
    } else {
        p = askSiteName(domainify(packageJson.name))
            .then(r => {
                linc.siteName = r.site_name;
                return checkSiteName(r.site_name);
            })
            .then(exists => {
                if (exists) throw new Error('This site name already exists.');
            })
    }

    p.then(() => askDescription(packageJson.description))
        .then(result => {
            linc.description = result.description;
            return askViewerProtocol();
        })
        .then(result => {
            linc.viewer_protocol = viewerProtocols[result.protocol.toUpperCase()].policy;
            return askErrorPagesDir();
        })
        .then(result => {
            linc.error_dir = result.error_dir;
            return askDomainNames();
        })
        .then(domains => {
            linc.domains = domains;
            console.log(`
You provided the following information:
${JSON.stringify(linc, null, 3)}
`);
            return askIsThisOk();
        })
        .then(result => {
            if (result.ok.toLowerCase().substr(0, 1) !== 'y') {
                console.log('Aborted by user.');
                process.exit(255);
            }

            // Make sure linc object contains site name
            packageJson.linc.siteName = packageJson.linc.siteName || linc.siteName;

            const method = siteName ? 'UPDATE' : 'CREATE';
            return createNewSite(linc, authParams, method)
                .then(result => {
                    console.log('Site successfully created.');
                    if (result.endpoint !== undefined) {
                        console.log(`
The endpoint for your site is:

    ${result.endpoint}

Use this endpoint to create CNAME entries for your custom domains
in your DNS. 
`);
                    }
                });
        })
        .then(() => {
            console.log('Updating your package.json.');
            return writePkg(packageJson);
        })
        .then(() => {
            console.log('Creating the error page templates.');
            return createErrorTemplates(process.cwd());
        })
        .then(() => resolve())
        .catch(err => reject(err));
});

const createSite = (argv) => {
    let authParams;
    let packageJson;

    console.log('Authorising user. Please wait...');

    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => authParams = auth_params)
        .catch(err => {
            console.log(`
${err.message}

Please log in using 'linc login', or create a new user with 
'linc user create' before trying to publish. 

If you created a user earlier, make sure to verify your email 
address. You cannot use LINC with an email address that is 
unverified.

If the error message doesn't make sense to you, please contact
us using the email address 'help@bitgenics.io'. 
`);
            process.exit(255);
        })
        .then(() => readPkg())
        .then(pkg => {
            packageJson = pkg;
            const linc = packageJson.linc;
            if (!linc || !linc.buildProfile || !linc.sourceDir) {
                throw new Error('This project is not initialised. Did you forget to \'linc init\'?');
            }

            return initSite(packageJson, authParams);
        })
        .then(() => authoriseSite(packageJson.linc.siteName, authParams))
        .catch(err => {
            console.log(err.message);
            process.exit(255);
        })

};

exports.command = 'create';
exports.desc = 'Create a site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    createSite(argv);
};
