/* eslint-disable max-len */
const _ = require('underscore');
const ora = require('ora');
const prompt = require('prompt');
const deployments = require('../lib/deployments');
const domains = require('../lib/domains');
const environments = require('../lib/environments');
const releases = require('../lib/releases');
const notice = require('../lib/notice');
const assertPkg = require('../lib/package-json').assert;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user for a deployment key
 */
const askDeploymentKey = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            deploy_key_index: {
                description: 'Deployment to release:',
                default: 'A',
                required: true,
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
 * Ask user for a domain to release to
 */
const askReleaseDomain = () => new Promise((resolve, reject) => {
    console.log(`
You can select one or more domains to release (using the same deployment key).
Simply type the letters associated with all the domains you want to release,
like so: A B E. Simply press <Enter> if you want to release the most recently
added domain name.
`);
    const schema = {
        properties: {
            domain_name_index: {
                description: 'Domain name(s) for release:',
                default: 'A',
                required: true,
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
 * Show available domains
 * @param _domains
 * @param siteName
 */
const showAvailableDomains = (_domains, siteName) => {
    console.log(`Here are the most recent domains for ${siteName}:`);

    let code = 65; /* 'A' */
    _domains.forEach(d => console.log(`${String.fromCharCode(code++)})  ${d.env || 'prod'}\t${d.domain_name}`));
};

/**
 * Show available deployment keys
 * @param _deployments
 * @param siteName
 */
const showAvailableDeployments = (_deployments, siteName) => {
    console.log(`\nHere are the most recent deployments for ${siteName}:`);

    let code = 65; /* 'A' */
    _deployments.forEach(d => console.log(`${String.fromCharCode(code++)})  ${d.env || 'prod'}\t${d.deploy_key}  ${d.description || ''}`));
};

/**
 * Ask user which environment to use
 */
const askEnvironment = () => new Promise((resolve, reject) => {
    console.log(`
Please select the environment to which you want to attach the domain.
`);
    const schema = {
        properties: {
            environment_index: {
                description: 'Environment to use:',
                pattern: /^(?!-)[a-zA-Z]$/,
                default: 'A',
                required: true,
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
 * Get domains and deployments in one go
 * @param site
 */
const getDomainsAndDeployments = (site) => Promise.all([
    domains.getAvailableDomains(site),
    deployments.getAvailableDeployments(site),
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
    const spinner = ora();
    spinner.start();

    const domainsToRelease = [];
    const siteName = argv.siteName;
    let envName = 'prod';
    let deployKey = null;

    spinner.start('Retrieving environments. Please wait...');
    return environments.getAvailableEnvironments(siteName)
        .then(envs => {
            spinner.stop();

            if (envs.environments.length < 1) return Promise.resolve('prod');
            if (envs.environments.length < 2) return Promise.resolve(envs.environments[0].name);

            environments.showAvailableEnvironments(envs);
            return askEnvironment()
                .then(env => {
                    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
                    if (index > envs.environments.length - 1) {
                        throw new Error('Invalid input.');
                    }
                    return Promise.resolve(envs.environments[index].name);
                });
        })
        .then(env => {
            envName = env;

            spinner.start('Retrieving domains and deployments. Please wait...');
            return getDomainsAndDeployments(siteName);
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

            return Promise.all(domainsToRelease.map(d => releases.createRelease(siteName, deployKey, d, envName)));
        })
        .then(() => {
            spinner.stop();
            console.log('Release(s) successfully created.');
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
    const spinner = ora();

    const domainsToRelease = [];
    const siteName = argv.siteName;
    let envName = 'prod';
    let deployKey = null;
    let listOfDeployments;

    spinner.start('Retrieving environments. Please wait...');
    environments.getAvailableEnvironments(siteName)
        .then(envs => {
            spinner.stop();

            if (envs.environments.length < 1) return Promise.resolve('prod');
            if (envs.environments.length < 2) return Promise.resolve(envs.environments[0].name);

            environments.showAvailableEnvironments(envs);
            return askEnvironment()
                .then(env => {
                    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
                    if (index > envs.environments.length - 1) {
                        throw new Error('Invalid input.');
                    }
                    return Promise.resolve(envs.environments[index].name);
                });
        })
        .then(env => {
            envName = env;

            spinner.start('Retrieving domains and deployments. Please wait...');
            return getDomainsAndDeployments(siteName);
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
                        .split('').filter((t, i, a) => a.indexOf(t) === i);

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
                });
        })
        .then(() => {
            spinner.stop();

            showAvailableDeployments(listOfDeployments, siteName);
            return askDeploymentKey(true)
                .then(reply => {
                    const index = reply.deploy_key_index.substr(0, 1).toUpperCase().charCodeAt(0) - 65;
                    if (index > listOfDeployments.length - 1) {
                        throw new Error('Invalid response. Aborted by user.');
                    }
                    deployKey = listOfDeployments[index].deploy_key;
                    spinner.text = 'Creating new release(s)...';
                    spinner.start();
                });
        })
        .then(() => Promise.all(domainsToRelease.map(d => releases.createRelease(siteName, deployKey, d, envName))))
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
