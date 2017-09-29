'use strict';
const ora = require('ora');
const auth = require('../../auth');
const prompt = require('prompt');
const request = require('request');
const notice = require('../../lib/notice');
const config = require('../../config.json');
const readPkg = require('read-pkg');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask whether user is sure
 */
const areYouSure = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            ok: {
                description: "Are you sure you want to delete the webhook?",
                default: 'Y',
                type: 'string'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    });
});

/**
 * Call API to delete webhook
 */
const deleteWebhookInBackend = (jwtToken, site_name, service) => new Promise((resolve, reject) => {
    console.log('Please wait...');

    service = service || 'GitHub';
    const options = {
        method: 'DELETE',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/webhooks/${service}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        }
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        else if (response.statusCode !== 200) return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        else return resolve(json);
    });
});

/**
 * Delete webhook
 * @param argv
 */
const deleteWebhook = (argv) => {
    let spinner = ora();
    let siteName;

    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (siteName === undefined) {
                throw new Error('No site name found in package.json. First run \'linc site create\' before proceeding.');
            }
            return areYouSure();
        })
        .then(result => {
            if (result.ok.toLowerCase() !== 'y') {
                throw new Error('Aborted by user');
            }
            spinner.start('Authorising. Please wait...');
            return auth(argv.accessKey, argv.secretKey);
        })
        .then(auth_params => {
            spinner.start('Deleting webhook. Please wait...');
            const jwtToken = auth_params.jwtToken;
            return deleteWebhookInBackend(jwtToken, siteName);
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
exports.handler = (argv) => {
    assertPkg();

    notice();

    deleteWebhook(argv);
};
