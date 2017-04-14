'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const config = require('../../config.json');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

const askSiteInfo = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-z]+[a-z0-9-]*$/,
                description: colors.green('Name of site to create:'),
                message: 'Only a-z, 0-9 and - are allowed. Must start with a-z.',
                required: true
            },
            description: {
                description: colors.green('Description (optional):'),
                required: false    
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

const createNewSite = (site, authInfo) => new Promise((resolve, reject) => {
    if (site.description.length === 0) site.description = "[No description]";

    const options = {
        method: 'POST',
        url: LINC_API_SITES_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: `{ "site_name": "${site.site_name}", "description": "${site.description}" }`
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
    console.log('Oops! Something went wrong:');
    console.log(err);
};

exports.command = 'create';
exports.desc = 'Create an account';
exports.handler = (argv) => {
    let siteName = null;
    askSiteInfo(true)
        .then(name => {
            siteName = name;
            console.log('Please wait...');
        })
        .then(() => auth(argv.accessKey, argv.secretKey))
        .then(auth_params => createNewSite(siteName, auth_params))
        .then(response => {
            console.log('Site successfully created.');
            if (response.endpoint !== undefined) {
                console.log(`The LINC endpoint for your site is ${response.endpoint}.`);
            }
        })
        .catch(err => error(err));
};
