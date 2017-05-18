'use strict';
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

const explanation = `
By setting up a webhook, you can automate part of your LINC experience.
In stead of manually building and publishing your site, you can create 
a webhook, e.g., from GitHub, which will be triggered whenever you push
your local repository to GitHub.

At this moment, LINC supports only GitHub webhooks. In order to set up
the GitHub webhook, we need some information about your repository. To
be more precise: we need your username and an access token. Access tokens
act like a 'password' in combination with your username. We need this to
retrieve your site archive before building (we wouldn't know what to
build otherwise).

You can create an access token by clicking on your profile picture in
GitHub, selecting 'Settings', then 'Personal Access Tokens' at the left.
You can always delete your token and create a new one. Make sure to copy
your token before closing, you won't be able to see it ever again.
`;

/**
 * Ask for a username
 */
const askUsername = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            user_name: {
                // Max length is 39 characters
                pattern: /^[a-z0-9][a-z0-9_]{0,37}[a-z0-9]$/,
                description: 'Please enter your (lowercase) GitHub username:',
                message: 'Please enter a valid GitHub username (a-z, 0-9 and _ are allowed).',
                required: true
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

/**
 * Ask for an access token
 */
const askAccessToken = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            access_token: {
                pattern: /^[0-9a-f]{40}$/,
                description: 'Please enter your GitHub access token:',
                message: 'Please enter a valid GitHub access token.',
                required: true
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

/**
 * Call API to create webhook
 */
const createWebhookInBackend = (jwtToken, site_name, service, body) => new Promise((resolve, reject) => {
    console.log('Please wait...');
    if (body === undefined) {
        body = service;
        service = 'GitHub';
    }
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/webhooks/${service}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(body)
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
 * Show webhook URL for the user's benefit.
 * @param webhook_url
 */
const showWebhookUrl = (webhook_url) => {
    console.log(`
Thank your for waiting. Please copy the following URL and paste it in 
the Webhook "Payload URL" field in GitHub:
    
    ${webhook_url}

and you're good to go! You can find this field in your repository 
Settings | Webhooks | Add Webhook. Please make sure to set the Content
type to 'application/json', or your webhook calls will fail.
`)
};

/**
 * Create webhook
 * @param argv
 */
const createWebhook = (argv) => {
    console.log(explanation);

    let siteName;
    const body = {};

    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (siteName === undefined) {
                throw new Error('No site name found in package.json. First run \'linc site create\' before proceeding.');
            }

            return askUsername();
        })
        .then(result => {
            body.user_name = result.user_name;
            return askAccessToken();
        })
        .then(result => {
            body.access_token = result.access_token;
            return auth(argv.accessKey, argv.secretKey);
        })
        .then(auth_params => {
            const jwtToken = auth_params.jwtToken;
            return createWebhookInBackend(jwtToken, siteName, body);
        })
        .then(response => showWebhookUrl(response.webhook_url))
        .catch(err => console.log(err.message));
};

exports.command = 'create';
exports.desc = 'Create a webhook';
exports.handler = (argv) => {
    assertPkg();

    notice();

    createWebhook(argv);
};
