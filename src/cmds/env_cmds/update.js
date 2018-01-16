const fs = require('fs-extra');
const ora = require('ora');
const prompt = require('prompt');
const environments = require('../../lib/environments');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user which environment to use
 */
const askEnvironment = () => new Promise((resolve, reject) => {
    console.log(`
Please select the environment you want to update.
`);
    const schema = {
        properties: {
            environment_index: {
                description: 'Environment to update:',
                pattern: /^(?!-)[a-zA-Z]$/,
                default: 'A',
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
 * Update environment settings
 * @param argv
 */
const updateEnvironment = (argv) => {
    const spinner = ora('Authorising. Please wait...');
    spinner.start();

    const siteName = argv.siteName;
    let envName = 'prod';
    let fileName;

    spinner.start('Retrieving environments. Please wait...');
    environments.getAvailableEnvironments(argv, siteName)
        .then(envs => {
            spinner.stop();

            if (envs.environments.length < 1) return Promise.resolve('prod');
            if (envs.environments.length < 2) return Promise.resolve(envs.environments[0].name);

            environments.showAvailableEnvironments(envs);
            return askEnvironment()
                .then(env => {
                    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
                    if (index > envs.environments.length - 1) {
                        throw new Error('Invalid input.');
                    }
                    return Promise.resolve(envs.environments[index].name);
                });
        })
        .then(env => {
            envName = env;

            return askSettingsFile(argv);
        })
        .then(settingsFileName => {
            fileName = settingsFileName;

            return fs.readJson(fileName);
        })
        .then(json => {
            spinner.start('Updating settings in environment. Please wait...');

            return environments.updateEnvironment(argv, json, envName, argv.siteName);
        })
        .then(() => {
            spinner.succeed('Environment successfully updated.');
        })
        .catch(err => {
            spinner.stop();

            console.log(err);
        });
};

exports.command = 'update';
exports.desc = 'Update an environment';
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    updateEnvironment(argv);
};
