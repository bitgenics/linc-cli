'use strict';
const login = require('../login/');
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');

const LINC_API_SITES_ENDPOINT = 'https://aduppa8es1.execute-api.us-west-2.amazonaws.com/v0/sites';

const getSiteName = () => new Promise((resolve, reject) => {

    const schema = {
        properties: {
            site_name: {
                // Fairly good pattern for allowed site names
                pattern: /^[a-zA-Z]+[a-zA-Z0-9-_]*$/,
                description: colors.white('Name of new site:'),
                required: true
            },
            description: {
                description: colors.white('Description (optional):'),
                required: false
            }
        }
    };

    prompt.message = colors.grey('(linc) ');
    prompt.delimiter = '';

    prompt.start();

    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const createNewSite = (site, authInfo) => new Promise((resolve, reject) => {
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

const error = (err) => {
    console.log(err);
};

const add = (argv) => {
    let authInfo = null;
    login(true)
        .then(auth => authInfo = auth)
        .then(() => getSiteName())
        .then(site => createNewSite(site, authInfo))
        .then(response => console.log(response.status))
        .catch(err => error(err));
};

module.exports = {
    add: add
};
