const fs = require('fs-extra');
const ora = require('ora');
const prompt = require('prompt');
const environments = require('../../lib/environments');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

const spinner = ora();

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
 * Show error message
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
};

/**
 * Update environment settings
 * @param argv
 */
const updateEnvironment = async (argv) => {
    const { siteName } = argv;

    spinner.start('Retrieving environments. Please wait...');
    const envs = await environments.getAvailableEnvironments(siteName);
    spinner.stop();

    let envName;
    if (envs.environments.length < 1) envName = 'prod';
    else if (envs.environments.length < 2) envName = envs.environments[0].name;
    else {
        await environments.showAvailableEnvironments(envs);
        const env = await askEnvironment();
        const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
        if (index > envs.environments.length - 1) {
            throw new Error('Invalid input.');
        }
        envName = envs.environments[index].name;
    }

    const fileName = await askSettingsFile(argv);
    const json = await fs.readJson(fileName);

    spinner.start('Updating settings in environment. Please wait...');
    await environments.updateEnvironment(json, envName, argv.siteName);
    spinner.succeed('Environment successfully updated.');
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

    updateEnvironment(argv)
        .catch(err => {
            spinner.stop();

            error(err);
        });
};
