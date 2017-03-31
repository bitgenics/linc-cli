'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../auth');

const LINC_API_SITES_ENDPOINT = "https://api.bitgenicstest.com/dev/sites";

const askSiteName = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-z]+[a-z0-9-]*$/,
                description: colors.green('Name of site to release:'),
                required: true
            }
        }
    };
    prompt.message = colors.magenta('(linc) ');
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const askReleaseInfo = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            deploy_key: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-f0-9]+$/,
                description: colors.green('Deployment key for release:'),
                required: true
            }
        }
    };
    prompt.message = colors.magenta('(linc) ');
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const askReleaseDomain = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            domain_name: {
                // This is the pattern AWS uses for domain names
                pattern: /^(\*\.)?(((?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9])\.)+((?!-)[A-Za-z0-9-]{1,62}[A-Za-z0-9])$/,
                description: colors.green('Domain name for release:'),
                required: true
            }
        }
    };
    prompt.message = colors.magenta('(linc) ');
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const getAvailableDeployments = (site_name, authInfo) => new Promise((resolve, reject) => {
    console.log('Please wait...');
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
        if (json.error) return reject(json.error);
        if (json.deployments.length === 0) return reject('No deployments available. Deploy your site using \'linc deploy\'.')

        return resolve(json);
    });
});

const getAvailableDomains = (site_name, authInfo) => new Promise((resolve, reject) => {
    console.log('Please wait...');
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/domains`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        }
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (json.domains.length === 0) return reject('No domains available. Add a domain first using \'linc domain add\'.');

        return resolve(json);
    });
});

const showAvailableDomains = (results) => {
    const domains = results.domains;
    const site_name = results.site_name;

    console.log(`Here are the most recent domains for ${site_name}:`);
    domains.forEach(d => {
        console.log(`  +- ${d.domain_name}`);
        console.log(`        +- Created at ${d.created_at}`);
    });
    console.log('');
};

const showAvailableDeployments = (results) => {
    const deployments = results.deployments;
    const site_name = results.site_name;

    console.log(`Here are the most recent deployments for ${site_name}:`);
    deployments.forEach(d => {
        console.log(`  +- Deployment key: ${d.deploy_key}`);
        if (d.description !== undefined) {
            console.log(`        +- Description: ${d.description}`);
        }
        console.log(`        +- Code ID: ${d.code_id}`);
        console.log(`        +- Created at ${d.created_at}`);
    });
};

const createNewRelease = (site_name, deploy_key, domain_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/releases`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: `{ "domainName": "${domain_name}", "deployKey": "${deploy_key}" }`
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

const error = (err) => {
    console.log('\nOops! Something went wrong, and your release could not be created. Here\'s what we know:');
    console.log(err);
};

const release = (argv) => {
    let authParams = null;
    let siteName = null;
    let deployKey = null;
    let domainName = null;
    askSiteName()
        .then(result => siteName = result.site_name.trim())
        .then(() => auth(argv.accessKey, argv.secretKey))
        .then(auth_params => authParams = auth_params)
        .then(() => getAvailableDeployments(siteName, authParams))
        .then(result => showAvailableDeployments(result))
        .then(() => askReleaseInfo(true))
        .then(result => deployKey = result.deploy_key)
        .then(() => getAvailableDomains(siteName, authParams))
        .then(result => showAvailableDomains(result))
        .then(() => askReleaseDomain())
        .then(result => domainName = result.domain_name)
        .then(() => createNewRelease(siteName, deployKey, domainName, authParams))
        .then(response => {
            console.log('Release successfully created.');
            if (response.endpoint !== undefined) {
                console.log(`The domain name for your site is ${response.endpoint}.`);
            }
        })
        .catch(err => error(err));
};

exports.command = 'release';
exports.desc = 'Release a site';
exports.handler = (argv) => {
    release(argv);
};
