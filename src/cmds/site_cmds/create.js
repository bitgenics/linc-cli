const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const isThisOk = require('../../lib/isThisOk');
const notice = require('../../lib/notice');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const config = require('../../config.json');
const domainify = require('../../lib/domainify');
const sites = require('../../lib/sites');
const viewerProtocols = require('../../lib/viewer-protocols');
const createErrorTemplates = require('../../lib/error-templates');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user for site name
 * @param name
 */
const askSiteName = (name) => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            site_name: {
                // Pattern AWS uses for host names.
                pattern: /^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/,
                default: name,
                description: 'Name of site to create:',
                message: 'Only a-z, 0-9 and - are allowed characters. Cannot start/end with -.',
                required: true,
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
 * Ask user for description
 * @param descr
 */
const askDescription = (descr) => new Promise((resolve, reject) => {
    console.log(`
Please provide a description for your site.`);

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
 * Ask for error pages directory
 */
const askErrorPagesDir = () => new Promise((resolve, reject) => {
    console.log(`
Please provide a directory containing custom error pages (HTML).
If such a directory doesn't yet exist, we will create one for you
and populate it with example error page templates. The default 
directory for custom error pages is 'errors'.`);

    const schema = {
        properties: {
            error_dir: {
                description: 'Error pages directory:',
                required: true,
                type: 'string',
                default: 'errors',
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
 * Ask user for viewer protocol
 */
const askViewerProtocol = () => new Promise((resolve, reject) => {
    console.log(`
Please choose the viewer protocol to use:
     A) ${viewerProtocols.A.name} (default)
     B) ${viewerProtocols.B.name}
     C) ${viewerProtocols.C.name}`);

    const schema = {
        properties: {
            protocol: {
                pattern: /^[A-Ca-c]$/,
                description: 'Protocol to use:',
                message: 'Please enter a valid option',
                type: 'string',
                default: 'A',
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
 * Validate domain name
 * @param x
 * @returns {boolean}
 */
const validateDomainName = (x) => {
    const match = /^(\*\.)?(((?!-)[a-z0-9-]{0,62}[a-z0-9])\.)+((?!-)[a-z0-9-]{1,62}[a-z0-9])$/.test(x);
    if (!match) {
        console.log(`ERROR: '${x}' is not a valid domain name.`);
    }
    return match;
};

/**
 * Ask for domain names
 */
const askDomainNames = () => new Promise((resolve, reject) => {
    console.log(`
If you want, you can already add domain names for your site.
However, if you don't want to do that just yet, or if you
don't know which domain names you're going to use, you can
also add them later using the command 'linc domain add'.
Please enter domain names separated by a comma:`);

    const schema = {
        properties: {
            domains: {
                description: 'Domains to add:',
                type: 'string',
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        if (result.domains === '') return resolve([]);

        const domains = result.domains.split(',');
        const validatedDomains = domains.map(x => x.trim()).filter(validateDomainName);
        if (domains.length !== validatedDomains.length) {
            console.log('ERROR: One or more domain names are invalid and have been removed from the list.');
        }
        return resolve(validatedDomains);
    });
});

/**
 * Check site name availability
 * @param siteName
 */
const checkSiteName = (siteName) => new Promise((resolve, reject) => {
    const spinner = ora('Checking availability of name. Please wait...').start();

    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/exists`,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    request(options, (err, response, body) => {
        if (err) {
            spinner.fail('Something went wrong');
            return reject(err);
        }

        const json = JSON.parse(body);
        if (response.statusCode === 200) {
            const exists = json.exists;
            if (exists) spinner.warn('Site already exists');
            else spinner.warn('Site name available');

            return resolve(exists);
        }

        spinner.fail('Something went wrong');
        return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
    });
});

/**
 * Initialise site
 * @param packageJson
 */
const initSite = (packageJson) => new Promise((resolve, reject) => {
    const siteName = packageJson.linc.siteName;

    const linc = {};
    let p;
    if (siteName) {
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
            });
    }

    p.then(() => askDescription(packageJson.description))
        .then(result => {
            linc.description = result.description;
            return askViewerProtocol();
        })
        .then(result => {
            linc.viewerProtocol = viewerProtocols[result.protocol.toUpperCase()].policy;
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
            return isThisOk();
        })
        .then(result => {
            if (result.ok.toLowerCase().substr(0, 1) !== 'y') {
                console.log('Aborted by user.');
                process.exit(255);
            }

            // Make sure linc object contains site name
            // eslint-disable-next-line no-param-reassign
            packageJson.linc.siteName = packageJson.linc.siteName || linc.siteName;

            const spinner = ora('Creating site. Please wait...').start();
            const method = siteName ? 'UPDATE' : 'CREATE';
            return sites.createSite(linc, method)
                .then(_result => {
                    spinner.stop();

                    console.log('Site successfully created.');
                    if (_result.endpoint !== undefined) {
                        console.log(`
The endpoint for your site is:

    ${_result.endpoint}

Use this endpoint to create CNAME entries for your custom domains
in your DNS. 
`);
                    }
                })
                .catch(err => {
                    spinner.stop();
                    return reject(err);
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

/**
 * Create site
 * @param argv
 */
const createSite = (argv) => {
    let packageJson;

    const spinner = ora();

    readPkg()
        .then(pkg => {
            packageJson = pkg;
            const linc = packageJson.linc;
            if (!linc || !linc.buildProfile) {
                throw new Error('This project is not initialised. Did you forget to \'linc init\'?');
            }

            return initSite(packageJson);
        })
        .then(() => {
            spinner.text = 'Authorising. Please wait...';
            spinner.start();
            return sites.authoriseSite(argv, packageJson.linc.siteName);
        })
        .then(() => spinner.stop())
        .catch(err => {
            spinner.stop();
            console.log(err.message);
        });
};

exports.command = 'create';
exports.desc = 'Create a site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    createSite(argv);
};
