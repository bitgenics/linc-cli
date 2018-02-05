const _ = require('underscore');
const ora = require('ora');
const prompt = require('prompt');
const figlet = require('figlet');
const notice = require('../lib/notice');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const installProfilePackage = require('../lib/install-profile-pkg');
const dotLinc = require('../lib/dot-linc');
const lincProfiles = require('../lib/linc-profiles');
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
 * Initialise package.json with LINC information for site.
 *
 * @param argv
 */
const initialise = async (argv) => {
    const spinner = ora();

    if (argv.buildProfile) {
        spinner.succeed('This project is already initialised.');
        process.exit(255);
    }

    // Create .linc directory if needed
    dotLinc.ensureDir();

    const linc = {};

    try {
        await linclet;

        /**
         * Handle profile
         */
        const result = await askProfile();
        const selectedProfile = result.profile.toUpperCase();
        let profile = lincProfiles[selectedProfile].pkg;
        if (!profile) {
            profile = await askOtherProfile();
        }
        linc.buildProfile = profile;

        /**
         * Install profile
         */
        spinner.start('Installing profile package. Please wait...');
        await installProfilePackage(profile, { force: true });
        spinner.succeed('Profile package installed.');

        /**
         * Update package.json
         */
        const packageJson = await readPkg();
        packageJson.linc = linc;
        await writePkg(packageJson);

        spinner.succeed('Updated package.json.');
        spinner.succeed('Done.');
    } catch (e) {
        error(e);
    }
};

exports.command = ['init', 'create'];
exports.desc = 'Initialise a new site locally';
exports.handler = (argv) => {
    assertPkg();

    notice();

    initialise(argv)
        .then(() => {});
};
