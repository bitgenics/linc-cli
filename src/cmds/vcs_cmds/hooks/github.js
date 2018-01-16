const ora = require('ora');
const webhooks = require('./webhooks');
const prompt = require('prompt');
const readPkg = require('read-pkg');
const usage = require('./usage');

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
const createHook = () => {
    console.log(usage);

    const spinner = ora();
    let siteName;
    const body = {};
    readPkg()
        .then(pkg => {
            // eslint-disable-next-line prefer-destructuring
            siteName = pkg.linc.siteName;
            if (!siteName) {
                // eslint-disable-next-line max-len
                throw new Error('No site name found in package.json. First run \'linc site create\' before proceeding.');
            }

            let repositoryUrl = '';
            const { repository } = pkg;
            if (repository && repository.type && repository.url) {
                if (repository.type === 'git') repositoryUrl = repository.url;
            }
            return askRepositoryUrl(repositoryUrl);
        })
        .then(result => {
            body.repositoryUrl = result.repositoryUrl;

            spinner.start('Creating webhook. Please wait...');
            return webhooks.createWebhook(siteName, 'github', body);
        })
        .then(response => {
            spinner.stop();
            if (response.errors) {
                console.log(`Oops. Something went wrong:\n${response.errors}`);
            } else {
                console.log('Your webhook has been created.');
            }
        })
        .catch(() => {
            spinner.stop();
            console.log('Oops. Something seems to have gone wrong.');
        });
};

/**
 * Delete existing hook
 */
const deleteHook = () => {
    const spinner = ora();

    readPkg()
        .then(pkg => {
            const { siteName } = pkg.linc;
            if (!siteName) {
                throw new Error('No site name found in package.json.');
            }

            spinner.start('Deleting webhook. Please wait...');
            return webhooks.deleteWebhook(siteName, 'github');
        })
        .then(response => {
            spinner.stop();
            if (response.errors) {
                console.log(`Oops. Something went wrong:\n${response.errors}`);
            } else {
                console.log('Your webhook has been deleted.');
            }
        })
        .catch(() => {
            spinner.stop();
            console.log('Oops. Something seems to have gone wrong.');
        });
};

/**
 * Entry point for this module
 * @param argv
 */
// eslint-disable-next-line consistent-return
module.exports.handler = argv => {
    const { command } = argv;
    if (!command) {
        console.log('You failed to provide a command.');
        process.exit(0);
    }

    if (command === 'create') return createHook();
    if (command === 'delete') return deleteHook();

    console.log('You provided an invalid command.');
};
