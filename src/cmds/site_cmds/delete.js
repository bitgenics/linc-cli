'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');

const LINC_API_SITES_ENDPOINT = 'https://aduppa8es1.execute-api.us-west-2.amazonaws.com/v0/sites';

const getSiteName = (message) => new Promise((resolve, reject) => {
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

    prompt.message = colors.magenta('(linc) ');
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const deleteSite = (site, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'DELETE',
        url: LINC_API_SITES_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: `{"site_name":"${site.site_name}"}`
    };

    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

const error = (err) => {
    console.log('\nOops! Something went wrong, and your site could not be deleted. Here\'s what we know:');
    console.log(err);
};

exports.command = 'delete';
exports.desc = 'Delete a site';
exports.handler = (argv) => {
    let siteName = null;
    getSiteName('Name of site to delete:')
        .then(name => {
            siteName = name;
            console.log('Please wait...');
        })
        .then(() => auth(argv.accessKey, argv.secretKey))
        .then(auth_params => deleteSite(siteName, auth_params))
        .then(() => console.log('Site successfully deleted.'))
        .catch(err => error(err));
};
