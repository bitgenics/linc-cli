'use strict';
const fs = require('fs');
const prompt = require('prompt');
const figlet = require('figlet');

prompt.colors = false;

const askSiteInfo = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-z]+[a-z0-9-]*$/,
                description: 'Name of site to create:',
                message: 'Only a-z, 0-9 and - are allowed. Must start with a-z.',
                required: true
            },
            description: {
                description: 'Description (optional):',
                required: false
            }
        }
    };

    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const askProfile = () => new Promise((resolve, reject) => {
    console.log(`
Please choose a profile:
     A) Generic React Redux Routerv3 profile (default)`);

    let schema = {
        properties: {
            profile: {
                pattern: /^(?:A|a)?$/,
                description: 'Profile to use:',
                message: 'Please enter a valid option',
                type: 'string',
                default: 'A'
            }
        }
    };
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const askViewerProtocol = () => new Promise((resolve, reject) => {
    console.log(`
Please choose the viewer protocol to use:
     A) Redirect HTTP to HTTPS (default)
     B) HTTP and HTTPS         
     C) HTTPS only`);

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
    prompt.message = '';
    prompt.delimiter = '';
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
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        if (result.domains === '') return resolve([]);

        let domains = result.domains.split(',');
        domains = domains.map(x => x.trim());
        const validated_domains = domains.filter(validateDomainName);
        if (domains.length !== validated_domains.length) {
            console.log('ERROR: One or more domain names are invalid and have been removed from the list.');
        }
        return resolve(validated_domains);
    })
});

const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
};

const f = (msg) => new Promise((resolve, reject) => {
    figlet(msg, (err, data) => {
        if (err) return reject();

        console.log(data);
        return resolve();
    });
});

/**
 *
 * @param argv
 *
 * Check existence of package.json (mandatory) OK
 * Ask user for site name OK
 * Ask user for HTTP[S] options OK
 * Ask user for profile (e.g., react) OK
 * Ask user for domain names (zero or more) OK
 *
 * Add profile package to package.json (for installing)
 * Add src-dir to linc section in package.json
 *
 * Install (npm / yarn)
 *
 * Create site
 * Create error pages (placeholders)
 *
 * Write sample linc[.server].config.js
 *
 */
const initialise = (argv) => {
    if (argv.siteName !== undefined) {
        console.log('This project is already initialised.');
        process.exit(255);
    }

    let siteName;
    let siteDescription;
    let profile;
    let protocol;
    let domains;

    f('LINC')
        .then(() => askSiteInfo())
        .then(info => {
            siteName = info.site_name;
            siteDescription = info.description;
            return askProfile();
        })
        .then(result => {
            profile = result.profile;
            return askViewerProtocol();
        })
        .then(result => {
            protocol = result.protocol;
            return askDomainNames();
        })
        .then(result => {
            domains = result;

            console.log(siteName);
            console.log(siteDescription);
            console.log(profile);
            console.log(protocol);
            console.log(JSON.stringify(domains, null, 3));
        })
        .catch(err => error(err));
};


exports.command = 'init';
exports.desc = 'Initialise a LINC site';
exports.handler = (argv) => {
    initialise(argv);
};
