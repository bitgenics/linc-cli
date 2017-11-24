'use strict';
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const notice = require('../../lib/notice');
const config = require('../../config.json');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        else if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);
        else return resolve(json);
    });
});

const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
    console.log(`
Please email us at help@bitgenics.io, so we can assist in manually adding the domain.`);
};

exports.command = 'add';
exports.desc = 'Add a domain name';
exports.handler = (argv) => {
    if (argv.siteName === undefined) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    assertPkg();

    notice();

    const spinner = ora('Authorising. Please wait...');
    askDomainName()
        .then(y => {
            spinner.start();
            return auth(argv.accessKey, argv.secretKey)
                .then(authParams => {
                    spinner.stop();
                    spinner.text = 'Adding domain. Please wait...';
                    spinner.start();
                    return addDomainName(y.domain_name, argv.siteName, authParams);
                })
        })
        .then(() => {
            spinner.stop();
            console.log(
`Domain name successfully added. Shortly, you may be receiving 
emails asking you to approve an SSL certificate.
`)
        })
        .catch(err => {
            spinner.stop();
            return error(err);
        });
};
