'use strict';
const login = require('../login/');
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');

const LINC_API_SITES_ENDPOINT = 'https://aduppa8es1.execute-api.us-west-2.amazonaws.com/v0/sites';

const getSiteName = (message, askDescription) => new Promise((resolve, reject) => {
    if (askDescription === undefined) askDescription = false;

    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-z]+[a-z0-9-]*$/,
                description: colors.white(message),
                required: true
            }
        }
    };
    if (askDescription) {
        schema.properties.description = {
            description: colors.white('Description (optional):'),
            required: false
        }
    }

    prompt.message = colors.grey('(linc) ');
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const createNewSite = (site, authInfo) => new Promise((resolve, reject) => {
    console.log('Please wait...');

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

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

const deleteSite = (site, authInfo) => new Promise((resolve, reject) => {
    console.log('Please wait...');

    const options = {
        method: 'DELETE',
        url: LINC_API_SITES_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: `{ "site_name": "${site.site_name}" }`
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

const add = (argv) => {
    let authInfo = null;
    let siteName = null;
    getSiteName('Name of site to create:', true)
        .then(name => siteName = name)
        .then(() => login(true))
        .then(auth => authInfo = auth)
        .then(() => createNewSite(siteName, authInfo))
        .then(() => console.log('Site successfully created.'))
        .catch(err => error(err));
};

const del = (argv) => {
    let authInfo = null;
    let siteName = null;
    getSiteName('Name of site to delete:')
        .then(name => siteName = name)
        .then(() => login(true))
        .then(auth => authInfo = auth)
        .then(() => deleteSite(siteName, authInfo))
        .then(() => console.log('Site successfully deleted.'))
        .catch(err => error(err));
};

module.exports = {
    add: add,
    del: del
};
