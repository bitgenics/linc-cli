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
 * Update environment in backend
 * @param settings
 * @param envName
 * @param siteName
 * @param authInfo
 * @returns {Promise<any>}
 */
const updateBackendEnvironment = (settings, envName, siteName, authInfo) => new Promise((resolve, reject) => {
    const body = {
        settings,
    };
    const options = {
        method: 'PUT',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/environments/${envName}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: JSON.stringify(body),
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
Please select the environment to which you want to attach the domain.
`);
    let schema = {
        properties: {
            environment_index: {
                description: 'Environment to use:',
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
 * Ask settings file (or use the -f flag)
 * @param argv
 * @returns {Promise<any>}
 */
const askSettingsFile = (argv) => new Promise((resolve, reject) => {
    if (argv.f && typeof argv.f === 'string' && argv.f.length > 0) {
        return resolve(argv.f);
    }

    const schema = {
        properties: {
            file_name: {
                // Simple pattern: at least one character, must end in .json
                pattern: /^[a-zA-Z]+[A-Za-z0-9-]*\.json$/,
                description: 'Settings file:',
                message: 'The settings file must be a valid JSON file.',
                required: true
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.file_name);
    });
});

/**
 * Update environment settings
 * @param argv
 */
const updateEnvironment = (argv) => {
    const spinner = ora('Authorising. Please wait...');
    spinner.start();

    let authInfo = null;
    let envName = 'prod';
    let fileName;

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

            return askSettingsFile(argv);
        })
        .then(settingsFileName => {
            fileName = settingsFileName;

            return fsp.readJson(fileName);
        })
        .then(json => {
            spinner.start('Updating settings in environment. Please wait...');

            return updateBackendEnvironment(json, envName, argv.siteName, authInfo);
        })
        .then(() => {
            spinner.succeed('Environment successfully updated.');
        })
        .catch(err => {
            spinner.stop();

            console.log(err)
        });
};

exports.command = 'update';
exports.desc = 'Update an environment';
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    updateEnvironment(argv);
};
