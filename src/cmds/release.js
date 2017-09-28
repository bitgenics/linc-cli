'use strict';
const prompt = require('prompt');
const request = require('request');
const auth = require('../auth');
const notice = require('../lib/notice');
const config = require('../config.json');
const assertPkg = require('../lib/package-json').assert;

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
    deployments.forEach(d => console.log(`     ${String.fromCharCode(code++)}) ${d.deploy_key}  ${d.description || ''}`));
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

    let domainsToRelease = [];
    let siteName = argv.siteName;
    let authParams = null;
    let deployKey = null;
    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => {
            authParams = auth_params;
            return getAvailableDomains(siteName, authParams);
        })
        .then(result => {
            showAvailableDomains(result);
            return askReleaseDomain()
                .then(reply => {
                    let ignored = false;

                    // Convert to uppercase, remove non A-Z characters and remove duplicates
                    const answers = reply.domain_name_index
                        .toUpperCase().replace(/[^A-Z]/, '')
                        .split('').filter((t,i,a) => a.indexOf(t) === i);

                    answers.forEach(a => {
                        const index = a.charCodeAt(0) - 65;
                        if (index > result.domains.length - 1) {
                            if (!ignored) {
                                ignored = true;
                                console.log('One or more invalid responses ignored.');
                            }
                        } else {
                            domainsToRelease.push(result.domains[index].domain_name);
                        }
                    });
                })
        })
        .then(() => getAvailableDeployments(siteName, authParams))
        .then(result => {
            showAvailableDeployments(result);
            return askDeploymentKey(true)
                .then(reply => {
                    let index = reply.deploy_key_index.substr(0, 1).toUpperCase().charCodeAt(0) - 65;
                    if (index > result.deployments.length - 1) {
                        throw new Error('Invalid response. Aborted by user.');
                    }
                    deployKey = result.deployments[index].deploy_key;
                    console.log('Please wait...');
                })
        })
        .then(() => Promise.all(domainsToRelease.map(d => createNewRelease(siteName, deployKey, d, authParams))))
        .then(response => console.log('Release(s) successfully created.'))
        .catch(err => error(err));
};

exports.command = 'release';
exports.desc = 'Release your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    release(argv);
};
