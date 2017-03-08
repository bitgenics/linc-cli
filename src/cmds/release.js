'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../auth');

const LINC_API_SITES_ENDPOINT = 'https://aduppa8es1.execute-api.us-west-2.amazonaws.com/v0/sites';

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
            },
            domain_name: {
                // Fairly good regex for domain name.
                pattern: /^([a-z0-9-]{1,63}\.)*[a-z0-9-]{1,63}\.[a-z0-9-]{2,63}$/,
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

        return resolve(json);
    });
});

const showAvailableDeployments = (results) => {
    const deployments = results.deployments;
    const count = deployments.length;
    const site_name = results.site_name;

    console.log(`Here are the most recent deployments for ${site_name}:`);
    deployments.forEach(d => {
        console.log(`Deployment created at ${d.created_at}:`);
        if (d.description !== undefined) {
            console.log(`  +- Description: ${d.description}`);
        }
        console.log(`  +- Code ID: ${d.code_id}`);
        console.log(`  +- Deployment key: ${d.deploy_key}`);
    });
    console.log(`Found ${count} deployments.\n`);
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
    console.log('\nOops! Something went wrong, and your site could not be created. Here\'s what we know:');
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
        .then(result => {
            deployKey = result.deploy_key;
            domainName = result.domain_name;
            console.log('Please wait...');
        })
        .then(() => createNewRelease(siteName, deployKey, domainName, authParams))
        .then(response => console.log(`
Release successfully created. Make sure to update your DNS settings:

   ${domainName}.\tCNAME\t${response.domain_name}.

in order to use your new release. 

We are in the process of requesting an SSL Certificate for your site. 
An email will be sent shortly to an administrator of your (top level) 
domain. The email will be sent to: 
admin, administrator, hostmaster, postmaster, and webmaster. 
You'll need to validate the request for a certificate to prove you own 
the site. Once that's done, we'll update your settings as soon as 
possible, so you can access your site using HTTPS. You can already 
access your site using HTTP. 
`))
        .catch(err => error(err));
};

exports.command = 'release';
exports.desc = 'Release a site';
exports.handler = (argv) => {
    release(argv);
};
