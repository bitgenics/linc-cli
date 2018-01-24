const ora = require('ora');
const webhooks = require('./webhooks');
const prompt = require('prompt');
const notice = require('../../lib/notice');
const readPkg = require('read-pkg');
const assertPkg = require('../../lib/package-json').assert;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask whether user is sure
 */
const areYouSure = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            ok: {
                description: 'Are you sure you want to delete the webhook?',
                default: 'Y',
                type: 'string',
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
 * Delete webhook
 */
const deleteWebhook = () => {
    const spinner = ora();
    let siteName;

    readPkg()
        .then(pkg => {
            // eslint-disable-next-line prefer-destructuring
            siteName = pkg.linc.siteName;
            if (siteName === undefined) {
                // eslint-disable-next-line max-len
                throw new Error('No site name found in package.json. First run \'linc site create\' before proceeding.');
            }
            return areYouSure();
        })
        .then(result => {
            if (result.ok.toLowerCase() !== 'y') {
                throw new Error('Aborted by user');
            }

            spinner.start('Deleting webhook. Please wait...');
            return webhooks.deleteWebhook(siteName);
        })
        .then(reply => {
            spinner.stop();
            console.log(reply.status);
        })
        .catch(err => {
            spinner.stop();
            console.log(err.message);
        });
};

exports.command = 'delete';
exports.desc = 'Delete a webhook';
exports.handler = () => {
    assertPkg();

    notice();

    deleteWebhook();
};
