'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const config = require('../../config.json');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

const askSiteName = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-z]+[a-z0-9-]*$/,
                description: colors.green('Name of site:'),
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

const askDomainName = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            domain_name: {
                // This is the pattern AWS uses for domain names
                pattern: /^(\*\.)?(((?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9])\.)+((?!-)[A-Za-z0-9-]{1,62}[A-Za-z0-9])$/,
                description: colors.green('Domain name to add:'),
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

const addDomainName = (domain_name, site_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/domains`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: `{ "domainName": "${domain_name}" }`
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

const error = (err) => {
    console.log('\nOops! Something went wrong, and your site could not be created. Here\'s what we know:');
    console.log(err);
};

exports.command = 'add';
exports.desc = 'Add a domain name';
exports.handler = (argv) => {
    let domainName = null;
    let siteName = null;

    askSiteName()
        .then(x => siteName = x.site_name)
        .then(() => askDomainName())
        .then(y => domainName = y.domain_name)
        .then(() => console.log('Please wait...'))
        .then(() => auth(argv.accessKey, argv.secretKey))
        .then(authParams => addDomainName(domainName, siteName, authParams))
        .then(() => console.log('Domain name successfully added.'))
        .catch(err => error(err));
};
