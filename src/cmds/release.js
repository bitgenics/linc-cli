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

const spinner = ora();

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
like so: A B E. 

Simply press <Enter> if you want to release to all your domains in one go.
`);

    const schema = {
        properties: {
            domain_name_index: {
                description: 'Domain name(s) for release:',
                default: '',
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
 * @param siteName
 */
const getDomainsAndDeployments = async (siteName) => ({
    deployments: await deployments.getAvailableDeployments(siteName),
    domains: await domains.getAvailableDomains(siteName),
});

/**
 * Show error message
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err.message ? err.message : err);
};

/**
 * Pick environment from a list
 * @param envs
 */
const pickEnvironment = async (envs) => {
    if (envs.environments.length < 1) return 'prod';
    if (envs.environments.length < 2) return envs.environments[0].name;

    await environments.showAvailableEnvironments(envs);
    const env = await askEnvironment();
    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
    if (index > envs.environments.length - 1) {
        throw new Error('Invalid input.');
    }
    return envs.environments[index].name;
};

/**
 * Release the latest version for all domains - don't ask for user input
 * @param argv
 */
const releaseLatest = async (argv) => {
    const domainsToRelease = [];
    const { siteName } = argv;
    let deployKey = null;

    spinner.start('Retrieving environments. Please wait...');
    const envs = await environments.getAvailableEnvironments(siteName);
    spinner.stop();

    const envName = await pickEnvironment(envs);

    spinner.start('Retrieving domains and deployments. Please wait...');
    const results = await getDomainsAndDeployments(siteName);
    spinner.stop();

    const listOfDeployments = _.filter(results.deployments.deployments, d => d.env === envName);
    const listOfDomains = _.filter(results.domains.domains, d => d.env === envName);
    if (listOfDomains.length === 0) {
        throw new Error('This environment contains no domains.');
    }

    deployKey = listOfDeployments[0].deploy_key;
    listOfDomains.map(d => domainsToRelease.push(d.domain_name));

    spinner.start('Creating new release(s)...');
    await Promise.all(domainsToRelease.map(d => releases.createRelease(siteName, deployKey, d, envName)));
    spinner.succeed('Release(s) successfully created.');
};

/**
 * Release a new version for one or more domains - ask for user input
 * @param argv
 */
const release = async (argv) => {
    const domainsToRelease = [];
    const { siteName } = argv;
    let deployKey = null;

    spinner.start('Retrieving environments. Please wait...');
    const envs = await environments.getAvailableEnvironments(siteName);
    spinner.stop();

    const envName = await pickEnvironment(envs);

    spinner.start('Retrieving domains and deployments. Please wait...');
    const results = await getDomainsAndDeployments(siteName);
    spinner.stop();

    const listOfDeployments = _.filter(results.deployments.deployments, d => d.env === envName);
    const listOfDomains = _.filter(results.domains.domains, d => d.env === envName);
    if (listOfDomains.length === 0) {
        throw new Error('This environment contains no domains.');
    }

    showAvailableDomains(listOfDomains, siteName);
    const domainResponse = await askReleaseDomain();

    // Convert to uppercase, remove non A-Z characters and remove duplicates
    let ignored = false;
    const domainIndex = domainResponse.domain_name_index;
    if (domainIndex === '') {
        // All domains in one go
        console.log(`
You have selected to release to all available domains!`);

        listOfDomains.map(d => domainsToRelease.push(d.domain_name));
    } else {
        const answers = domainIndex
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
    }

    showAvailableDeployments(listOfDeployments, siteName);
    const deployResponse = await askDeploymentKey(true);

    const index = deployResponse.deploy_key_index.substr(0, 1).toUpperCase().charCodeAt(0) - 65;
    if (index > listOfDeployments.length - 1) {
        throw new Error('Invalid response. Aborted by user.');
    }
    deployKey = listOfDeployments[index].deploy_key;

    spinner.start('Creating new release(s)...');
    await Promise.all(domainsToRelease.map(d => releases.createRelease(siteName, deployKey, d, envName)));
    spinner.succeed('Release(s) successfully created.');
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

    (argv.a ? releaseLatest : release)(argv)
        .catch(err => {
            spinner.stop();

            error(err);
        });
};
