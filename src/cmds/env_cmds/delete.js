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
Please select the environment you want to delete.
`);
    const schema = {
        properties: {
            environment_index: {
                description: 'Environment to delete:',
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
 * Show error message
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
};

/**
 * Pick environment from a list
 * @param envs
 */
const pickEnvironment = async (envs) => {
    if (envs.environments.length < 1) return 'prod';
    if (envs.environments.length < 2) return envs.environments[0].name;

    await environments.showAvailableEnvironments(envs);
    const env = await askEnvironment();
    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
    if (index > envs.environments.length - 1) {
        throw new Error('Invalid input.');
    }
    return envs.environments[index].name;
};

/**
 * Delete environment
 * @param argv
 */
const deleteEnvironment = async (argv) => {
    const { siteName } = argv;

    spinner.start('Retrieving environments. Please wait...');
    const envs = await environments.getAvailableEnvironments(siteName);
    spinner.stop();

    const envName = await pickEnvironment(envs);
    if (envName === 'prod') {
        throw new Error('Error: you cannot delete the default environment \'prod\'.');
    }

    spinner.start('Deleting environment. Please wait...');
    await environments.deleteEnvironment(envName, siteName);
    spinner.succeed('Environment successfully deleted.');
};

exports.command = 'delete';
exports.desc = 'Delete an environment';
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    deleteEnvironment(argv)
        .catch(err => {
            spinner.stop();

            error(err);
        });
};
