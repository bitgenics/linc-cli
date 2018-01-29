const ora = require('ora');
const webhooks = require('./webhooks');
const prompt = require('prompt');
const notice = require('../../lib/notice');
const readPkg = require('read-pkg');
const assertPkg = require('../../lib/package-json').assert;

const spinner = ora();

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
const deleteWebhook = async () => {
    const pkg = await readPkg();
    const { siteName } = pkg.linc;
    if (!siteName) {
        // eslint-disable-next-line max-len
        throw new Error('No site name found in package.json. First run \'linc site create\' before proceeding.');
    }

    const result = await areYouSure();
    if (result.ok.toLowerCase() !== 'y') {
        throw new Error('Aborted by user');
    }

    spinner.start('Deleting webhook. Please wait...');
    const response = await webhooks.deleteWebhook(siteName);
    spinner.stop();

    console.log(response.status);
};

exports.command = 'delete';
exports.desc = 'Delete a webhook';
exports.handler = () => {
    assertPkg();

    notice();

    deleteWebhook()
        .catch(err => {
            spinner.stop();

            console.log(err);
        });
};
