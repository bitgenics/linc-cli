'use strict';
const fsp = require('fs-promise');
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const config = require('../../config.json');
const environments = require('../../lib/environments');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Delete environment in backend
 * @param envName
 * @param siteName
 * @param authInfo
 * @returns {Promise<any>}
 */
const deleteBackendEnvironment = (envName, siteName, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'DELETE',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/environments/${envName}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (response.statusCode !== 200) return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));

        return resolve(json);
    });
});

/**
 * Show available environments
 * @param results
 */
const showAvailableEnvironments = (results) => {
    const environments = results.environments;
    const siteName = results.site_name;

    console.log(`Here are the available environments for ${siteName}:`);

    let code = 65; /* 'A' */
    environments.forEach(e => console.log(`${String.fromCharCode(code++)})  ${e.name || 'prod'}`));
};

/**
 * Ask user which environment to use
 */
const askEnvironment = () => new Promise((resolve, reject) => {
    console.log(`
Please select the environment you want to delete.
`);
    let schema = {
        properties: {
            environment_index: {
                description: 'Environment to delete:',
                pattern: /^(?!-)[a-zA-Z]$/,
                default: 'A',
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
 * Delete environment
 * @param argv
 */
const deleteEnvironment = (argv) => {
    const spinner = ora('Authorising. Please wait...');
    spinner.start();

    let authInfo = null;
    let envName = 'prod';

    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => {
            authInfo = auth_params;

            spinner.start('Retrieving environments. Please wait...');
            return environments.getAvailableEnvironments(argv.siteName, authInfo);
        })
        .then(envs => {
            spinner.stop();

            if (envs.environments.length < 1) return Promise.resolve('prod');
            if (envs.environments.length < 2) return Promise.resolve(envs.environments[0].name);

            showAvailableEnvironments(envs);
            return askEnvironment()
                .then(env => {
                    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
                    if (index > envs.environments.length - 1) {
                        throw new Error('Invalid input.');
                    }
                    return Promise.resolve(envs.environments[index].name);
                })
        })
        .then(env => {
            envName = env;

            if (envName === 'prod') {
                throw new Error('You cannot delete the default environment \'prod\'.');
            }

            spinner.start('Deleting environment. Please wait...');

            return deleteBackendEnvironment(envName, argv.siteName, authInfo);
        })
        .then(() => {
            spinner.succeed('Environment successfully deleted.');
        })
        .catch(err => {
            spinner.stop();

            console.log(err.message ? err.message : err);
        });
};

exports.command = 'delete';
exports.desc = 'Delete an environment';
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    deleteEnvironment(argv);
};
