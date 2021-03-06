const ora = require('ora');
const webhooks = require('./webhooks');
const prompt = require('prompt');
const readPkg = require('read-pkg');
const usage = require('./usage');

const spinner = ora();

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask for a username
 */
const askRepositoryUrl = suggestion => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            repositoryUrl: {
                pattern: /^[^/@]+(?::\/\/|@)(?:github.com)[/:]([^/]+)\/([^.]+)(\.git)?$/,
                default: suggestion,
                description: 'Please enter your GitHub repository URL:',
                message: 'Please enter a valid GitHub URL.',
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
 * Create a new webhook
 */
const createHook = async () => {
    console.log(usage);

    const body = {};
    const pkg = await readPkg();

    const { siteName } = pkg.linc;
    if (!siteName) {
        // eslint-disable-next-line max-len
        throw new Error('No site name found in package.json. First run \'linc site create\' before proceeding.');
    }

    let repositoryUrl = '';
    const { repository } = pkg;
    if (repository && repository.type && repository.url) {
        if (repository.type === 'git') repositoryUrl = repository.url;
    }

    const result = await askRepositoryUrl(repositoryUrl);
    body.repositoryUrl = result.repositoryUrl;

    spinner.start('Creating webhook. Please wait...');
    const response = await webhooks.createWebhook(siteName, 'github', body);
    spinner.stop();

    if (response.errors) {
        console.log(`Oops. Something went wrong:\n${response.errors}`);
    } else {
        console.log('Your webhook has been created.');
    }
};

/**
 * Delete existing hook
 */
const deleteHook = async () => {
    const pkg = await readPkg();
    const { siteName } = pkg.linc;
    if (!siteName) {
        throw new Error('No site name found in package.json.');
    }

    spinner.start('Deleting webhook. Please wait...');
    const response = await webhooks.deleteWebhook(siteName, 'github');
    spinner.stop();

    if (response.errors) {
        console.log(`Oops. Something went wrong:\n${response.errors}`);
    } else {
        console.log('Your webhook has been deleted.');
    }
};

/**
 * Entry point for this module
 * @param argv
 */
module.exports.handler = argv => {
    const { command } = argv;
    if (!command) {
        console.log('You failed to provide a command. Valid commands are:');
        console.log('   - create: create a new webhook');
        console.log('   - delete: delete a existing webhook');
        process.exit(0);
    }

    let p;
    if (command === 'create') p = createHook;
    if (command === 'delete') p = deleteHook;
    if (p) {
        p().catch(err => {
            spinner.stop();

            console.log(err);
        });
    } else {
        console.log('You provided an invalid command.');
    }
};
