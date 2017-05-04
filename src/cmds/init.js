'use strict';
const fs = require('fs');
const path = require('path');
const prompt = require('prompt');
const figlet = require('figlet');
const notice = require('../lib/notice');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const lincProfiles = require('../lib/linc-profiles');
const createErrorTemplates = require('../lib/error-templates');
const exec = require('child_process').exec;
const request = require('request');
const copyDir = require('copy-dir');
const auth = require('../auth');
const config = require('../config.json');
const domainify = require('../lib/domainify');
const assertPkg = require('../lib/package-json').assert;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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

const askSourceDir = () => new Promise((resolve, reject) => {
    console.log(`
Please provide the directory containing your source code.
We assume the default directory for your source code is 'src'.`);

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

const askIsThisOk = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            ok: {
                description: "Is this OK?",
                default: 'Yes',
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
    console.log('Something went wrong:');
    console.log(err.message);
};

const linclet = (msg) => new Promise((resolve, reject) => {
    figlet(msg, (err, data) => {
        if (err) return reject();

        console.log(data);
        return resolve();
    });
});

const installProfilePkg = (pkgName) => new Promise((resolve, reject) => {
    const command = fs.existsSync(process.cwd() + '/yarn.lock')
        ? `yarn add ${pkgName}` : `npm i ${pkgName} -D`;

    exec(command, {cwd: process.cwd()}, () => {
        console.log('Finished installing profile package.');
        return resolve();
    });
});

const copyConfigExamples = (pkgName, destDir) => new Promise((resolve, reject) => {
    const src_dir = process.cwd() + '/node_modules/' + pkgName + '/config_samples';
    if (fs.existsSync(src_dir)) {
        console.log('Copying example config files...');
        const filter = (stat, filepath, filename) => (stat === 'file' && path.extname(filepath) === '.js' && !fs.existsSync(path.resolve(destDir, filename)));
        copyDir(src_dir, destDir, filter, err => {
            if (err) return reject(err);

            let fileList = [];
            fs.readdir(src_dir, (err, files) => {
                files.forEach(file => {
                    if (/^.*.js$/.test(file)) {
                        fileList.push(file);
                    }
                });
                if (fileList.length > 0) {
                    console.log(`The following files were copied into ${destDir}/:`);
                    fileList.forEach(file => console.log(`+ ${file}`));
                }
                return resolve();
            });
        });
    } else {
        return resolve();
    }
});

/**
 * Initialise package.json with linc site
 *
 * @param argv
 */
const initialise = (argv) => {
    if (argv.siteName !== undefined) {
        console.log('This project is already initialised.');
        process.exit(255);
    }

    let linc = {};

    let profile;

    linclet('LINC')
        .then(() => readPkg())
        .then(pkg => {
            notice();
            return askSiteName(domainify(pkg.name))
                .then(info => {
                    linc.siteName = info.site_name.trim();
                    return askDescription(pkg.description);
            })
        })
        .then(info => {
            linc.siteDescription = info.description.trim();
            return askSourceDir();
        })
        .then(result => {
            linc.sourceDir = result.source_dir;
            return askErrorPagesDir();
        })
        .then(result => {
            linc.errorDir = result.error_dir;
            return askProfile();
        })
        .then(result => {
            profile = result.profile;
            console.log(`
The following section will be added to package.json:
${JSON.stringify({linc: linc}, null, 3)}
`);
            return askIsThisOk();
        })
        .then(result => {
            if (result.ok.charAt(0).toLowerCase() !== 'y') {
                console.log('Aborted by user.');
                return process.exit(255);
            }
        })
        .then(() => {
            console.log('\nInstalling profile package. Please wait...');
            const profilePackage = `${lincProfiles[profile].pkg}`;
            return installProfilePkg(profilePackage)
                .then(() => copyConfigExamples(profilePackage, linc.sourceDir));
        })
        .then(() => readPkg())
        .then(packageJson => {
            console.log('Updating package.json.');
            packageJson.linc = linc;
            return writePkg(packageJson);
        })
        .then(() => {
            console.log('Creating the error page templates.');
            return createErrorTemplates(process.cwd());
        })
        .then(() => console.log(`Done.

As a next step, you can build and test your site locally. In order to 
do so, simply run 'linc build', then 'linc serve'. Please make sure 
you have updated the configuration file we copied into your source 
folder first. It is called 'linc.config.js', and we need it to build 
your site and ready it for deployment later on.

Before fully deploying your site, you need to be logged into LINC. 
Make sure to run 'linc user create' if you haven't signed up with LINC 
yet, or 'linc login' if you have.

To finally deploy your site, run 'linc deploy'. It will ask a few more 
questions regarding your site, after which the site package is uploaded 
to the LINC servers and deployed within a few moments. 

For more information, to provide feedback or to ask for help, please
drop us a line at help@bitgenics.io. 
`))
        .catch(err => error(err));
};

exports.command = 'init';
exports.desc = 'Initialise a LINC site';
exports.handler = (argv) => {
    assertPkg();

    initialise(argv);
};
