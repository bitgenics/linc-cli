'use strict';
const npm = require('npm');
const fs = require('fs');
const prompt = require('prompt');
const figlet = require('figlet');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const lincProfiles = require('../linc-profiles');
const viewerProtocols = require('../viewer-protocols');
const exec = require('child_process').exec;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const askSourceDir = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            source_dir: {
                description: 'Site source directory:',
                required: true,
                type: 'string',
                default: 'src'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const askProfile = () => new Promise((resolve, reject) => {
    console.log(`
Please choose a profile:
     A) ${lincProfiles['A'].name} (default)`);

    let schema = {
        properties: {
            profile: {
                pattern: /^(?:A|a)?$/,
                description: 'Profile to use for this site:',
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

const installProfilePkg = (pkgName) => new Promise((resolve, reject) => {
    exec(`npm i ${pkgName} -D`, {cwd: process.cwd()}, () => {
        console.log('Done.');
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
 * Add profile package to package.json (for installing) OK
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
    let sourceDir;
    let profile;
    let protocol;
    let domains;

    f('LINC')
        .then(() => askSiteInfo())
        .then(info => {
            siteName = info.site_name;
            siteDescription = info.description;
            return askSourceDir();
        })
        .then(result => {
            sourceDir = result.source_dir;
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
            let domainStr = '';
            domains.forEach(x => domainStr += '\n  - ' + x);
            console.log(`
Summary:
+ Site name: ${siteName}
+ Description: ${siteDescription}
+ Source directory: ${sourceDir}
+ Site profile: ${lincProfiles[profile].name}
+ Viewer protocol: ${viewerProtocols[protocol].name}
+ Domains: ${domainStr}
`);
        })
        .then(() => askIsThisOk())
        .then(result => {
            if (result.ok.charAt(0).toLowerCase() !== 'y') {
                console.log('Aborted by user.');
                return process.exit(255);
            }
        })
        .then(() => {
            console.log('\nInstalling profile package.\nPlease wait...');
            const profilePackage = `@bitgenics/linc-profile-${lincProfiles[profile].pkg}`;
            return installProfilePkg(profilePackage);
        })
        .then(() => readPkg())
        .then(pkg => {
            console.log('Updating package.json.\nPlease wait...');
            pkg.linc = {
                siteName: siteName,
                description: siteDescription,
                buildProfile: lincProfiles[profile].pkg,
                viewerProtocol: viewerProtocols[protocol].policy,
                sourceDir: sourceDir,
                domains: domains
            };
            console.log(JSON.stringify(pkg, null, 3));
            return writePkg(pkg);
        })
        .then(() => console.log('Done.'))
        .catch(err => error(err));
};

exports.command = 'init';
exports.desc = 'Initialise a LINC site';
exports.handler = (argv) => {
    initialise(argv);
};
