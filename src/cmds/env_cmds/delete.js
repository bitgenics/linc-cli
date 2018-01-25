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
 * Show available environments
 * @param results
 */
const showAvailableEnvironments = (results) => {
    const siteName = results.site_name;

    console.log(`Here are the available environments for ${siteName}:`);

    let code = 65; /* 'A' */
    results.environments.forEach(e => console.log(`${String.fromCharCode(code++)})  ${e.name || 'prod'}`));
};

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
 * Delete environment
 * @param argv
 */
const deleteEnvironment = async (argv) => {
    const { siteName } = argv;
    let envName;

    spinner.start('Retrieving environments. Please wait...');
    const envs = await environments.getAvailableEnvironments(siteName);
    spinner.stop();

    if (envs.environments.length < 1) envName = 'prod';
    else if (envs.environments.length < 2) envName = envs.environments[0].name;
    else {
        await showAvailableEnvironments(envs);
        const env = await askEnvironment();
        const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
        if (index > envs.environments.length - 1) {
            throw new Error('Error: invalid input.');
        }
        envName = envs.environments[index].name;
    }

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
