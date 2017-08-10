'use strict';
const auth = require('../../../auth');
const config = require('../../../config.json');
const prompt = require('prompt');
const readPkg = require('read-pkg');
const request = require('request');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

const explanation = `By setting up a VCS webhook, you can automate part of your LINC
experience. In stead of manually building and publishing your 
site, we can actually start the build as soon as you've pushed 
new code to your repository.

All we need (after your authorised LINC to access your repository) 
is the URL of the repository you want to set up for automatic 
deploying.
`;

/**
 * Ask for a username
 */
const askRepositoryUrl = suggestion => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            repositoryUrl: {
                pattern: /^(?:http|https|git)(?::\/\/|@)bitbucket\.org(?:\/|:)(.*)\/([^.\/]*)(?:.git)?$/,
                default: suggestion,
                description: 'Please enter your Bitbucket repository URL:',
                message: 'Please enter a valid Bitbucket URL.',
                required: true
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result);
    })
});

/**
 * Create webhook by calling appropriate API endpoint
 * @param jwtToken
 * @param siteName
 * @param body
 */
const createWebhookInBackend = (jwtToken, siteName, body) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/hooks/bitbucket`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(body)
    };
    return request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        if (response.statusCode !== 200) {
            return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        }

        return resolve(json);
    });
});

/**
 * Create new hook
 * @param argv
 */
const createHook = argv => {
    console.log(explanation);

    let siteName;
    const body = {};
    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (!siteName) {
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

            console.log('Please wait...');
            return auth(argv.accessKey, argv.secretKey);
        })
        .then(auth_params => {
            const jwtToken = auth_params.jwtToken;
            return createWebhookInBackend(jwtToken, siteName, body);
        })
        .then(response => {
            if (response.errors) {
                console.log(`Oops. Something went wrong:\n${response.errors}`);
            } else {
                console.log('Your webhook has been created.');
            }
        })
        .catch(err => console.log('Oops. Something seems to have gone wrong.'));
};

/**
 * Delete existing hook
 * @param argv
 */
const deleteHook = argv => {

};

/**
 * Entry point for this module
 * @param argv
 */
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
