const _ = require('underscore');
const fs = require('fs-extra');
const ora = require('ora');
const path = require('path');
const prompt = require('prompt');
const figlet = require('figlet');
const notice = require('../lib/notice');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const dotLinc = require('../lib/dot-linc');
const lincProfiles = require('../lib/linc-profiles');
const exec = require('child_process').exec;
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

    const schema = {
        properties: {
            profile: {
                pattern: /^[A-Za-z]$/,
                description: 'Profile to use for this site:',
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
    const command = fs.existsSync(path.join(process.cwd(), 'yarn.lock'))
        ? `yarn add ${pkgName} -D` : `npm i ${pkgName} -D`;

    exec(command, { cwd: process.cwd() }, (err) => {
        if (err) return reject(err);

        return resolve();
    });
});

/**
 * Ask for name of "Other" profile
 */
const askOtherProfile = () => new Promise((resolve, reject) => {
    console.log();

    const schema = {
        properties: {
            profile: {
                description: '\nProfile name to use for this site:',
                message: 'Please enter a valid option',
                type: 'string',
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.profile);
    });
});

/**
 * Prompt question from profile
 * @param q
 */
const promptQuestion = (q) => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            answer: {
                description: q.text,
                type: 'string',
                default: q.dflt,
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.answer);
    });
});

/**
 * Copy example config files
 * @param linc
 * @param pkg
 * @returns {Promise<any>}
 */
const handleExampleConfigFiles = (linc, pkg) => new Promise((resolve, reject) => {
    const pkgDir = path.resolve(process.cwd(), 'node_modules', pkg);
    const srcDir = path.resolve(pkgDir, 'config_samples');
    const destDir = linc.sourceDir;

    // We're done if there are no example configuration files, or no destination dir provided
    if (!fs.existsSync(srcDir)) return resolve();
    if (!destDir) return resolve();

    let profile;
    try {
        // eslint-disable-next-line import/no-dynamic-require,global-require
        profile = require(pkgDir);
    } catch (e) {
        return reject(e);
    }

    if (!profile.getConfigSampleFiles) return resolve();

    const configSampleFiles = profile.getConfigSampleFiles();

    const spinner = ora('Copying example config files. Please wait...');
    spinner.start();

    const promises = _.map(configSampleFiles, f => fs.copy(path.resolve(srcDir, f), path.resolve(destDir, f)));

    return Promise.all(promises)
        .then(() => {
            spinner.succeed('Successfully copied example config files:');
            _.each(configSampleFiles, f => console.log(`  + ${f}`));

            return resolve();
        })
        .catch(err => {
            spinner.fail('Could not copy example config files');

            return reject(err);
        });
});

/**
 * Handle init questions from profile (if any)
 * @param linc
 * @param pkg
 */
const handleInitQuestions = (linc, pkg) => new Promise((resolve, reject) => {
    let profile;
    try {
        // eslint-disable-next-line import/no-dynamic-require,global-require
        profile = require(path.resolve(process.cwd(), 'node_modules', pkg));
    } catch (e) {
        return reject(e);
    }

    if (!profile.getInitQuestions) {
        return resolve();
    }

    const questions = profile.getInitQuestions();
    const keys = Object.keys(questions);

    const askQuestion = () => {
        if (_.isEmpty(keys)) return resolve();

        const key = keys.shift();
        const q = questions[key];
        return promptQuestion(q)
            .then(response => {
                // eslint-disable-next-line no-param-reassign
                linc[key] = response;
                return askQuestion();
            })
            .catch(err => reject(err));
    };

    if (_.isEmpty(keys)) return resolve();

    console.log('\nThis profile needs some additional information.');
    return askQuestion();
});

/**
 * Initialise package.json with LINC information for site.
 *
 * @param argv
 */
const initialise = (argv) => {
    const spinner = ora();

    if (argv.buildProfile) {
        spinner.succeed('This project is already initialised.');
        process.exit(255);
    }

    // Create .linc directory if needed
    dotLinc.ensureDir();

    const linc = {};

    linclet('LINC')
        .then(() => askProfile())
        .then(result => {
            const selectedProfile = result.profile.toUpperCase();

            const profile = lincProfiles[selectedProfile].pkg;
            return profile ? Promise.resolve(profile) : askOtherProfile();
        })
        .then(profile => {
            linc.buildProfile = profile;

            spinner.start('Installing profile package. Please wait...');

            return installProfilePkg(profile)
                .then(() => {
                    spinner.succeed('Profile package installed.');

                    return handleInitQuestions(linc, profile);
                })
                .then(() => handleExampleConfigFiles(linc, profile));
        })
        .then(() => readPkg())
        .then(packageJson => {
            spinner.succeed('Updated package.json.');

            // eslint-disable-next-line no-param-reassign
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
