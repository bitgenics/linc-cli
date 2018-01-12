const fsp = require('fs-promise');
const ora = require('ora');
const prompt = require('prompt');
const environments = require('../../lib/environments');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask environment name (or use the -n flag)
 * @param argv
 * @returns {Promise<any>}
 */
const askEnvName = (argv) => new Promise((resolve, reject) => {
    if (argv.n && typeof argv.n === 'string' && argv.n.length > 0) {
        return resolve(argv.n);
    }

    const schema = {
        properties: {
            env_name: {
                // Simple pattern: at least one character
                pattern: /^[a-z]+$/,
                description: 'Name of environment:',
                message: 'Must be a valid environment name (lowercase only).',
                required: true,
            },
        },
    };
    prompt.start();
    return prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.env_name);
    });
});

/**
 * Ask settings file (or use the -f flag)
 * @param argv
 * @returns {Promise<any>}
 */
const askSettingsFile = (argv) => new Promise((resolve, reject) => {
    if (argv.f && typeof argv.f === 'string' && argv.f.length > 0) {
        return resolve(argv.f);
    }

    const schema = {
        properties: {
            file_name: {
                // Simple pattern: at least one character, must end in .json
                pattern: /^[a-zA-Z]+[A-Za-z0-9-]*\.json$/,
                description: 'Settings file:',
                message: 'The settings file must be a valid JSON file.',
                required: true,
            },
        },
    };
    prompt.start();
    return prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.file_name);
    });
});

/**
 * Create environment
 * @param argv
 */
const createEnvironment = (argv) => {
    let envName;
    let fileName;
    const siteName = argv.siteName;

    const spinner = ora();
    askEnvName(argv)
        .then(_envName => {
            envName = _envName;

            return askSettingsFile(argv);
        })
        .then(settingsFileName => {
            fileName = settingsFileName;

            spinner.start('Creating environment. Please wait...');
            return fsp.readJson(fileName)
                .then(json => environments.addEnvironment(argv, json, envName, siteName));
        })
        .then(() => {
            spinner.stop();

            console.log('Environment successfully added.');
        })
        .catch(err => {
            spinner.stop();

            console.log(err);
        });
};

exports.command = 'create';
exports.desc = 'Create an environment';
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    createEnvironment(argv);
};
