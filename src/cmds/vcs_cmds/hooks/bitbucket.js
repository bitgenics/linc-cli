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
                pattern: /^[^/@]+(?::\/\/|@)bitbucket\.org(?:[/:])(.*)\/([^./]*)(?:.git)?$/,
                default: suggestion,
                description: 'Please enter your Bitbucket repository URL:',
                message: 'Please enter a valid Bitbucket URL.',
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
 * Create new hook
 */
const createHook = () => {
    console.log(usage);

    const spinner = ora();
    let siteName;
    const body = {};
    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (!siteName) {
                throw new Error('No site name found in package.json.');
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
            return webhooks.createWebhook(siteName, 'bitbucket', body);
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
    let siteName;
    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (!siteName) {
                throw new Error('No site name found in package.json.');
            }

            spinner.start('Deleting webhook. Please wait...');
            return webhooks.deleteWebhook(siteName, 'bitbucket');
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
    if (command === 'create') return createHook();
    if (command === 'delete') return deleteHook();

    console.log('You provided an invalid command.');
};
