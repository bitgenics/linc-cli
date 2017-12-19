'use strict';
const ora = require('ora');
const prompt = require('prompt');
const readPkg = require('read-pkg');
const request = require('request');
const auth = require('../../auth');
const environments = require('../../lib/environments');
const notice = require('../../lib/notice');
const config = require('../../config.json');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user for domain name
 */
const askDomainName = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            domain_name: {
                // This is the pattern AWS uses for domain names
                pattern: /^(\*\.)?(((?!-)[a-z0-9-]{0,62}[a-z0-9])\.)+((?!-)[a-z0-9-]{1,62}[a-z0-9])$/,
                description: 'Domain name to add:',
                message: 'Must be a valid domain name (lowercase only).',
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
 * Add domain name
 * @param domainName
 * @param envName
 * @param site_name
 * @param authInfo
 * @returns {Promise<any>}
 */
const addDomainName = (domainName, envName, site_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/domains`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: JSON.stringify({
            domainName,
            envName
        }),
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        else if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);
        else return resolve(json);
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

const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
    console.log(`
If the problem persists, please email us at help@bitgenics.io,
so we can assist in adding the domain.`);
};

exports.command = 'add';
exports.desc = 'Add a domain name';
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    let authInfo;
    let envName;
    const spinner = ora('Authorising. Please wait...');
    readPkg()
        .then(pkg => {
            const linc = pkg.linc;
            if (!linc || !linc.buildProfile || !linc.sourceDir) {
                return Promise.reject(new Error('Initalisation incomplete. Did you forget to run `linc site create`?'));
            }

            spinner.start();
            return auth(argv.accessKey, argv.secretKey);
        })
        .then(auth => {
            authInfo = auth;
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
                    console.log(env);
                    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
                    if (index > envs.environments.length - 1) {
                        throw new Error('Invalid input.');
                    }
                    return Promise.resolve(envs.environments[index].name);
                })
        })
        .then(env => {
            envName = env;
            return askDomainName();
        })
        .then(y => {
            spinner.start('Adding domain. Please wait...');
            return addDomainName(y.domain_name, envName, argv.siteName, authInfo);
        })
        .then(() => {
            spinner.stop();
            console.log(
`Domain name successfully added. Shortly, you may be receiving 
emails asking you to approve an SSL certificate (if needed).
`);
        })
        .catch(err => {
            spinner.stop();
            return error(err.message);
        });
};
