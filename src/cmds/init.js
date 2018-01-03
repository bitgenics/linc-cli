'use strict';
const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt');
const figlet = require('figlet');
const notice = require('../lib/notice');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const lincProfiles = require('../lib/linc-profiles');
const exec = require('child_process').exec;
const copyDir = require('copy-dir');
const assertPkg = require('../lib/package-json').assert;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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

/**
 * Show profiles available
 */
const showProfiles = () => {
    console.log(`
Please choose a profile:
`);
    _.each(lincProfiles, (p, k) => {
        console.log(`${k}) ${p.name}`);
    });
};

/**
 * Ask for a profile from the list of known profiles
 */
const askProfile = () => new Promise((resolve, reject) => {
    showProfiles();

    let schema = {
        properties: {
            profile: {
                pattern: /^[A-Za-z]{1}$/,
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
        ? `yarn add ${pkgName} -D` : `npm i ${pkgName} -D`;

    console.log(command);
    exec(command, {cwd: process.cwd()}, (err) => {
        if (err) return reject(err);

        console.log('Finished installing profile package.');
        return resolve();
    });
});

const copyConfigExamples = (pkgName, destDir) => new Promise((resolve, reject) => {
    const src_dir = process.cwd() + '/node_modules/' + pkgName + '/config_samples';
    if (fs.existsSync(src_dir)) {
        console.log('Copying example config files...');

        const filter = (stat, filepath, filename) => {
            return stat === 'file'
                && path.extname(filepath) === '.js'
                && !fs.existsSync(path.resolve(destDir, filename));
        };

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
 * Create an application settings file, but only if it doesn't yet exists.
 *
 * @param destDir Directory to put application settings file in
 */
const createSiteSettings = (destDir) => new Promise((resolve, reject) => {
    const settingsFile = 'site-settings.json';
    const settingsFilePath = path.resolve(destDir, settingsFile);

    if (fs.existsSync(settingsFilePath)) return resolve('File exists.');

    fs.writeFile(settingsFilePath, `${JSON.stringify({}, null, 3)}\n`, 'utf-8', err => {
        if (err) return reject(err);
        else return  resolve();
    })
});

/**
 * Initialise package.json with LINC information for site.
 *
 * @param argv
 */
const initialise = (argv) => {
    if (argv.buildProfile && argv.sourceDir) {
        console.log('This project is already initialised.');
        process.exit(255);
    }

    let linc = {};

    linclet('LINC')
        .then(() => askProfile())
        .then(result => {
            const profile = result.profile.toUpperCase();
            linc.buildProfile = lincProfiles[profile].pkg;
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
            const profilePackage = linc.buildProfile;
            return installProfilePkg(profilePackage)
                .then(() => copyConfigExamples(profilePackage, linc.sourceDir))
                .then(() => createSiteSettings(process.cwd()));
        })
        .then(() => readPkg())
        .then(packageJson => {
            console.log('\nUpdating package.json.');
            packageJson.linc = linc;
            return writePkg(packageJson);
        })
        .then(() => console.log('Done.'))
        .catch(err => error(err));
};

exports.command = ['init', 'create'];
exports.desc = 'Initialise a new site locally';
exports.handler = (argv) => {
    assertPkg();

    notice();

    initialise(argv);
};
