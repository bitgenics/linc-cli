'use strict';
const _ = require('underscore');
const fs = require('fs');
const ora = require('ora');
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
                pattern: /^[A-Za-z]$/,
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

        return resolve(result);
    })
});

/**
 * Are the settings Ok?
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

        return resolve(result);
    });
});

/**
 * Show error
 * @param err
 */
const error = (err) => {
    console.log('Something went wrong:');
    console.log(err.message);
};

/**
 * Show LINC messsage :)
 * @param msg
 * @returns {Promise<any>}
 */
const linclet = (msg) => new Promise((resolve, reject) => {
    figlet(msg, (err, data) => {
        if (err) return reject();

        console.log(data);
        return resolve();
    });
});

/**
 * Install selected profile package
 * @param pkgName
 * @returns {Promise<any>}
 */
const installProfilePkg = (pkgName) => new Promise((resolve, reject) => {
    const command = fs.existsSync(process.cwd() + '/yarn.lock')
        ? `yarn add ${pkgName} -D` : `npm i ${pkgName} -D`;

    exec(command, {cwd: process.cwd()}, (err) => {
        if (err) return reject(err);

        return resolve();
    });
});

/**
 * Copy example config files
 * @param pkgName
 * @param destDir
 * @returns {Promise<any>}
 */
const copyConfigExamples = (pkgName, destDir) => new Promise((resolve, reject) => {
    const srcDir = path.resolve(process.cwd(), 'node_modules', pkgName, 'config_samples');

    // We're done if there are no example configuration files
    if (!fs.existsSync(srcDir)) return resolve();

    const spinner = ora('Copying example config files. Please wait...');
    spinner.start();

    const filter = (stat, filepath, filename) => {
        return stat === 'file'
            && path.extname(filepath) === '.js'
            && !fs.existsSync(path.resolve(destDir, filename));
    };

    copyDir(srcDir, destDir, filter, err => {
        if (err) return reject(err);

        let fileList = [];
        fs.readdir(srcDir, (err, files) => {
            files.forEach(file => {
                if (/^.*.js$/.test(file)) {
                    fileList.push(file);
                }
            });
            if (fileList.length > 0) {
                spinner.succeed(`The following files were copied into ${destDir}/:`);
                fileList.forEach(file => console.log(`  + ${file}`));
            }
            return resolve();
        });
    });
});

/**
 * Ask for name of "Other" profile
 */
const askOtherProfile = () => new Promise((resolve, reject) => {
    console.log();

    let schema = {
        properties: {
            profile: {
                description: '\nProfile name to use for this site:',
                message: 'Please enter a valid option',
                type: 'string'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.profile);
    })
});

/**
 * Prompt question from profile
 * @param q
 */
const promptQuestion = (q) => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            answer: {
                description: q.text,
                type: 'string',
                default: q.dflt
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.answer);
    })
});

/**
 * Handle init questions from profile (if any)
 * @param linc
 * @param pkg
 */
const handleInitQuestions = (linc, pkg) => new Promise((resolve, reject) => {
    try {
        const path = require('path');

        const profile = require(path.resolve(process.cwd(), 'node_modules', pkg));
        if (!profile.getInitQuestions) {
            return resolve();
        }

        const questions = profile.getInitQuestions();
        const keys = Object.keys(questions);

        const askQuestion = () => {
            if (_.isEmpty(keys)) return resolve();

            const key = keys.shift();
            const q = questions[key];
            promptQuestion(q)
                .then(response => {
                    linc[key] = response;
                    return askQuestion();
                })
                .catch(err => reject(err));
        };

        if (!_.isEmpty(keys)) {
            console.log('\nThis profile needs some additional information.');
            askQuestion();
        }
    }
    catch (e) {
        console.log(e);
        return reject(e);
    }
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
    let spinner = ora();

    linclet('LINC')
        .then(() => askProfile())
        .then(result => {
            const selectedProfile = result.profile.toUpperCase();

            const profile = lincProfiles[selectedProfile].pkg;
            return profile ? Promise.resolve(profile) : askOtherProfile();
        })
        .then(profile => {
            linc.buildProfile = profile;
        })
        .then(() => {
            spinner.start('Installing profile package. Please wait...');

            const profilePackage = linc.buildProfile;
            return installProfilePkg(profilePackage)
                .then(() => {
                    spinner.succeed('Profile package installed.');

                    return handleInitQuestions(linc, profilePackage)
                })
                .then(() => copyConfigExamples(profilePackage, linc.sourceDir));
        })
        .then(() => {
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
        .then(() => readPkg())
        .then(packageJson => {
            spinner.succeed('Updated package.json.');
            packageJson.linc = linc;
            return writePkg(packageJson);
        })
        .then(() => console.log('Done.'))
        .catch(err => error(err))
        .then(() => spinner.stop());
};

exports.command = ['init', 'create'];
exports.desc = 'Initialise a new site locally';
exports.handler = (argv) => {
    assertPkg();

    notice();

    initialise(argv);
};
