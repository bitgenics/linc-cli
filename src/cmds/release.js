'use strict';
const _ = require('underscore');
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const auth = require('../auth');
const domains = require('../lib/domains');
const environments = require('../lib/environments');
const notice = require('../lib/notice');
const config = require('../config.json');
const assertPkg = require('../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user for a deployment key
 */
const askDeploymentKey = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            deploy_key_index: {
                description: 'Deployment to release:',
                default: 'A',
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
 * Ask user for a domain to release to
 */
const askReleaseDomain = () => new Promise((resolve, reject) => {
    console.log(`
You can select one or more domains to release (using the same deployment key).
Simply type the letters associated with all the domains you want to release,
like so: A B E. Simply press \<Enter\> if you want to release the most recently
added domain name.
`);
    let schema = {
        properties: {
            domain_name_index: {
                description: 'Domain name(s) for release:',
                default: 'A',
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
 * Retrieve available deployments from back end
 * @param site_name
 * @param authInfo
 */
const getAvailableDeployments = (site_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/deployments`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        }
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        else if (response.statusCode !== 200) return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        else if (json.deployments.length === 0) return reject(new Error('No deployments available. Deploy your site using \'linc deploy\'.'));
        else return resolve(json);
    });
});

/**
 * Show available domains
 * @param domains
 * @param siteName
 */
const showAvailableDomains = (domains, siteName) => {
    console.log(`Here are the most recent domains for ${siteName}:`);

    let code = 65; /* 'A' */
    domains.forEach(d => console.log(`${String.fromCharCode(code++)})  ${d.env || 'prod'}\t${d.domain_name}`));
};

/**
 * Show available deployment keys
 * @param deployments
 * @param siteName
 */
const showAvailableDeployments = (deployments, siteName) => {
    console.log(`\nHere are the most recent deployments for ${siteName}:`);

    let code = 65; /* 'A' */
    deployments.forEach(d => console.log(`${String.fromCharCode(code++)})  ${d.env || 'prod'}\t${d.deploy_key}  ${d.description || ''}`));
};

/**
 * Create a new release in the back end
 * @param siteName
 * @param deployKey
 * @param domainName
 * @param envName
 * @param authInfo
 */
const createNewRelease = (siteName, deployKey, domainName, envName, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/releases`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: JSON.stringify({
            domainName,
            deployKey,
            envName,
        }),
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

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
 * Get domains and deployments in one go
 * @param site
 * @param auth
 * @returns {Promise<[any , any]>}
 */
const getDomainsAndDeployments = (site, auth) => Promise.all([
    domains.getAvailableDomains(site, auth),
    getAvailableDeployments(site, auth),
]);

/**
 * Show error message
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err.message);
};

/**
 * Release the latest version for all domains - don't ask for user input
 * @param argv
 */
const releaseLatest = (argv) => {
    const spinner = ora('Authorising. Please wait...');
    spinner.start();

    let domainsToRelease = [];
    let siteName = argv.siteName;
    let envName = 'prod';
    let authInfo = null;
    let deployKey = null;

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

            spinner.start('Retrieving domains and deployments. Please wait...');
            return getDomainsAndDeployments(siteName, authInfo);
        })
        .then(result => {
            spinner.stop();

            const listOfDeployments = _.filter(result[1].deployments, d => d.env === envName);
            const listOfDomains = _.filter(result[0].domains, d => d.env === envName);

            if (listOfDomains.length === 0) {
                throw new Error('This environment contains no domains.');
            }

            deployKey = listOfDeployments[0].deploy_key;
            listOfDomains.map(d => domainsToRelease.push(d.domain_name));

            spinner.text = 'Creating new release(s)...';
            spinner.start();

            return Promise.all(domainsToRelease.map(d => createNewRelease(siteName, deployKey, d, envName, authInfo)));
        })
        .then(() => {
            spinner.stop();
            console.log(`Release(s) successfully created.`);
        })
        .catch(err => {
            spinner.stop();
            return error(err);
        });
};

/**
 * Release a new version for one or more domains - ask for user input
 * @param argv
 */
const release = (argv) => {
    const spinner = ora('Authorising. Please wait...');
    spinner.start();

    let domainsToRelease = [];
    let siteName = argv.siteName;
    let envName = 'prod';
    let authInfo = null;
    let deployKey = null;
    let listOfDeployments;

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

            spinner.start('Retrieving domains and deployments. Please wait...');
            return getDomainsAndDeployments(siteName, authInfo);
        })
        .then(result => {
            spinner.stop();

            listOfDeployments = _.filter(result[1].deployments, d => d.env === envName);
            const listOfDomains = _.filter(result[0].domains, d => d.env === envName);

            if (listOfDomains.length === 0) {
                throw new Error('This environment contains no domains.');
            }

            showAvailableDomains(listOfDomains, siteName);
            return askReleaseDomain()
                .then(reply => {
                    let ignored = false;

                    // Convert to uppercase, remove non A-Z characters and remove duplicates
                    const answers = reply.domain_name_index
                        .toUpperCase().replace(/[^A-Z]/, '')
                        .split('').filter((t,i,a) => a.indexOf(t) === i);

                    answers.forEach(a => {
                        const index = a.charCodeAt(0) - 65;
                        if (index > listOfDomains.length - 1) {
                            if (!ignored) {
                                ignored = true;
                                console.log('One or more invalid responses ignored.');
                            }
                        } else {
                            domainsToRelease.push(listOfDomains[index].domain_name);
                        }
                    });
                })
        })
        .then(() => {
            spinner.stop();

            showAvailableDeployments(listOfDeployments, siteName);
            return askDeploymentKey(true)
                .then(reply => {
                    let index = reply.deploy_key_index.substr(0, 1).toUpperCase().charCodeAt(0) - 65;
                    if (index > listOfDeployments.length - 1) {
                        throw new Error('Invalid response. Aborted by user.');
                    }
                    deployKey = listOfDeployments[index].deploy_key;
                    spinner.text = 'Creating new release(s)...';
                    spinner.start();
                })
        })
        .then(() => Promise.all(domainsToRelease.map(d => createNewRelease(siteName, deployKey, d, envName, authInfo))))
        .then(() => {
            spinner.stop();
            console.log(`
Release(s) successfully created.`);
        })
        .catch(err => {
            spinner.stop();
            return error(err);
        });
};

exports.command = 'release';
exports.desc = 'Release your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    if (argv.a) {
        releaseLatest(argv);
    } else {
        release(argv);
    }
};
