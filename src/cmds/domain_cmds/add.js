const ora = require('ora');
const prompt = require('prompt');
const readPkg = require('read-pkg');
const domains = require('../../lib/domains');
const environments = require('../../lib/environments');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

const spinner = ora();

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user for domain name
 */
const askDomainName = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            domainName: {
                // This is the pattern AWS uses for domain names
                pattern: /^(\*\.)?(((?!-)[a-z0-9-]{0,62}[a-z0-9])\.)+((?!-)[a-z0-9-]{1,62}[a-z0-9])$/,
                description: 'Domain name to add:',
                message: 'Must be a valid domain name (lowercase only).',
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
 * Show available environments
 * @param results
 */
const showAvailableEnvironments = (results) => {
    const siteName = results.site_name;

    console.log(`Here are the available environments for ${siteName}:`);

    let code = 65; /* 'A' */
    results.environments.forEach(e => console.log(`${String.fromCharCode(code++)})  ${e.name || 'prod'}`));
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
 * Error message
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
};

/**
 * Add a domain
 * @param siteName
 */
const addDomain = async (siteName) => { // eslint-disable-line consistent-return
    const pkg = await readPkg();
    const { linc } = pkg;
    if (!linc || !linc.buildProfile) {
        throw new Error('Initalisation incomplete. Did you forget to run `linc site create`?');
    }

    spinner.start('Retrieving environments. Please wait...');
    const envs = await environments.getAvailableEnvironments(siteName);
    spinner.stop();

    if (envs.environments.length < 1) return 'prod';
    if (envs.environments.length < 2) return envs.environments[0].name;

    showAvailableEnvironments(envs);
    const env = await askEnvironment();

    const index = env.environment_index.toUpperCase().charCodeAt(0) - 65;
    if (index > envs.environments.length - 1) {
        throw new Error('Invalid input.');
    }
    const envName = envs.environments[index].name;
    const { domainName } = await askDomainName();

    spinner.start('Adding domain. Please wait...');
    await domains.addDomain(domainName, envName, siteName);
    spinner.stop();

    console.log(`Domain name successfully added. Shortly, you may be receiving 
emails asking you to approve an SSL certificate (if needed).
`);
};

exports.command = 'add';
exports.desc = 'Add a domain name';
exports.handler = (argv) => {
    const { siteName } = argv;

    if (!siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    addDomain(siteName)
        .then(() => {})
        .catch(err => {
            spinner.stop();
            error(err);
        });

};
