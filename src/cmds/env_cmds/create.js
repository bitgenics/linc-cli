'use strict';
const fsp = require('fs-promise');
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const config = require('../../config.json');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Create environment in backend
 * @param settings
 * @param envName
 * @param siteName
 * @param authInfo
 * @returns {Promise<any>}
 */
const addEnvironment = (settings, envName, siteName, authInfo) => new Promise((resolve, reject) => {
    const body = {
        envName,
        settings,
    };
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/environments`,
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
        else if (response.statusCode !== 200) return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));
        else return resolve(json);
    });
});

/**
 * Ask environment name (or use the -n flag)
 * @param argv
 * @returns {Promise<any>}
 */
const askEnvName = (argv) => new Promise((resolve, reject) => {
    if (argv.n && typeof argv.n === 'string' && argv.n.length > 0) {
        return resolve(argv.n);
    }

    const schema = {
        properties: {
            env_name: {
                // Simple pattern: at least one character
                pattern: /^[a-z]+$/,
                description: 'Name of environment:',
                message: 'Must be a valid environment name (lowercase only).',
                required: true
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.env_name);
    });
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

    return reject(new Error('No settings file name provided (use -f <file name>)'));
});

/**
 * Create environment
 * @param argv
 */
const createEnvironment = (argv) => {
    let envName;
    let fileName;

    const spinner = ora('Authorising. Please wait...');
    askEnvName(argv)
        .then(_envName => {
            envName = _envName;

            return askSettingsFile(argv);
        })
        .then(settingsFileName => {
            fileName = settingsFileName;

            spinner.start();
            return auth(argv.accessKey, argv.secretKey);
        })
        .then(authInfo => {
            return fsp.readJson(fileName)
                .then(json => addEnvironment(json, envName, argv.siteName, authInfo));
        })
        .then(() => {
            spinner.stop();

            console.log('Environment successfully added.');
        })
        .catch(err => {
            spinner.stop();

            console.log(err)
        });
};

exports.command = 'create';
exports.desc = 'Create an environment';
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    createEnvironment(argv);
};
