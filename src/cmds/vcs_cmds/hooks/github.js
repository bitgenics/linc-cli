'use strict';
const ora = require('ora');
const auth = require('../../../auth');
const config = require('../../../config.json');
const prompt = require('prompt');
const readPkg = require('read-pkg');
const request = require('request');
const usage = require('./usage');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask for a username
 */
const askRepositoryUrl = suggestion => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            repositoryUrl: {
                pattern: /^[^\/@]+(?::\/\/|@)(?:github.com)[\/:]([^\/]+)\/([^.]+)(\.git)?$/,
                default: suggestion,
                description: 'Please enter your GitHub repository URL:',
                message: 'Please enter a valid GitHub URL.',
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
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/hooks/github`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(body)
    };
    return request.post(options, (err, response, body) => {
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
 * Delete webhook in backend
 * @param jwtToken
 * @param siteName
 */
const deleteWebhookInBackend = (jwtToken, siteName) => new Promise((resolve, reject) => {
    const options = {
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/hooks/github`,
        headers: {
            'Authorization': `Bearer ${jwtToken}`
        },
    };
    return request.delete(options, (err, response, body) => {
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
 * Create a new webhook
 * @param argv
 */
const createHook = argv => {
    console.log(usage);

    let spinner = ora();
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

            spinner.start('Authorising. Please wait...');
            return auth(argv.accessKey, argv.secretKey);
        })
        .then(auth_params => {
            spinner.start('Creating webhook. Please wait...');
            const jwtToken = auth_params.jwtToken;
            return createWebhookInBackend(jwtToken, siteName, body);
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
    let spinner = ora();
    let siteName;
    readPkg()
        .then(pkg => {
            siteName = pkg.linc.siteName;
            if (!siteName) {
                throw new Error('No site name found in package.json.');
            }
            spinner.start('Authorising. Please wait...');
            return auth(argv.accessKey, argv.secretKey);
        })
        .then(auth_params => {
            spinner.start('Deleting webhook. Please wait...');
            const jwtToken = auth_params.jwtToken;
            return deleteWebhookInBackend(jwtToken, siteName);
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
