'use strict';
const prompt = require('prompt');
const request = require('request');
const auth = require('../auth');
const config = require('../config.json');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

const askDeploymentKey = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            deploy_key_index: {
                description: 'Deployment key for release:',
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

const askReleaseDomain = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            domain_name_index: {
                description: 'Domain name for release:',
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
        if (json.error) return reject(json.error);
        else if (response.statusCode !== 200) return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        else if (json.deployments.length === 0) return reject(new Error('No deployments available. Deploy your site using \'linc deploy\'.'));
        else return resolve(json);
    });
});

const getAvailableDomains = (site_name, authInfo) => new Promise((resolve, reject) => {
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
        else if (response.statusCode !== 200) return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        else if (!json.domains || json.domains.length === 0) return reject(new Error('No domains available. Add a domain first using \'linc domain add\'.'));
        else return resolve(json);
    });
});

const showAvailableDomains = (results) => {
    const domains = results.domains;
    const site_name = results.site_name;

    console.log(`Here are the most recent domains for ${site_name}:`);

    let code = 65; /* 'A' */
    domains.forEach(d => console.log(`     ${String.fromCharCode(code++)}) ${d.domain_name}`));
};

const showAvailableDeployments = (results) => {
    const deployments = results.deployments;
    const site_name = results.site_name;

    console.log(`\nHere are the most recent deployments for ${site_name}:`);

    let code = 65; /* 'A' */
    deployments.forEach(d => console.log(`     ${String.fromCharCode(code++)}) ${d.deploy_key}  (${d.description || ''})`));
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
    console.log('Oops! Something went wrong:');
    console.log(err.message);
};

const release = (argv) => {
    if (argv.siteName === undefined) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    console.log('Please wait...');

    let siteName = argv.siteName;
    let authParams = null;
    let domainName = null;
    let deployKey = null;
    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => {
            authParams = auth_params;
            return getAvailableDomains(siteName, authParams);
        })
        .then(result => {
            showAvailableDomains(result);
            return askReleaseDomain()
                .then(answer => {
                    let index = answer.domain_name_index.substr(0, 1).charCodeAt(0) - 65;
                    if (index > result.domains.length-1) {
                        throw new Error('Invalid response. Aborted by user.');
                    }
                    domainName = result.domains[index].domain_name;
                })
        })
        .then(() => getAvailableDeployments(siteName, authParams))
        .then(result => {
            showAvailableDeployments(result);
            return askDeploymentKey(true)
                .then(answer => {
                    let index = answer.deploy_key_index.substr(0, 1).charCodeAt(0) - 65;
                    if (index > answer.deploy_key_index-1) {
                        throw new Error('Invalid response. Aborted by user.');
                    }
                    deployKey = result.deployments[index].deploy_key;
                })
        })
        .then(() => createNewRelease(siteName, deployKey, domainName, authParams))
        .then(response => {
            console.log('Release successfully created.');
            if (response.endpoint !== undefined) {
                console.log(`Please be reminded the domain name for your site is:\n     ${response.endpoint}.`);
            }
        })
        .catch(err => error(err));
};

exports.command = 'release';
exports.desc = 'Release a site';
exports.handler = (argv) => {
    release(argv);
};
