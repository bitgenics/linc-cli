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
 * @param argv
 */
const createHook = argv => {
    console.log(usage);

    const spinner = ora();
    let siteName;
    const body = {};
    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (!siteName) {
                // eslint-disable-next-line max-len
                throw new Error('No site name found in package.json. First run \'linc site create\' before proceeding.');
            }

            let repositoryUrl = '';
            const repository = pkg.repository;
            if (repository && repository.type && repository.url) {
                if (repository.type === 'git') repositoryUrl = repository.url;
            }
            return askRepositoryUrl(repositoryUrl);
        })
        .then(result => {
            body.repositoryUrl = result.repositoryUrl;

            spinner.start('Creating webhook. Please wait...');
            return webhooks.createWebhook(argv, siteName, 'github', body);
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
 * @param argv
 */
const deleteHook = argv => {
    const spinner = ora();
    let siteName;
    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (!siteName) {
                throw new Error('No site name found in package.json.');
            }

            spinner.start('Deleting webhook. Please wait...');
            return webhooks.deleteWebhook(argv, siteName, 'github');
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
    if (!argv.command) {
        console.log('You failed to provide a command.');
        process.exit(0);
    }

    const command = argv.command;
    if (command === 'create') return createHook(argv);
    if (command === 'delete') return deleteHook(argv);

    console.log('You provided an invalid command.');
};
