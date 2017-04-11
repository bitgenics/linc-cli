'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const config = require('../../config.json');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

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

const deleteSite = (siteName, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'DELETE',
        url: LINC_API_SITES_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: `{"site_name":"${siteName}"}`
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));

        return resolve(json);
    });
});

const error = (err) => {
    console.log('\nOops! Something went wrong, and your site could not be deleted. Here\'s what we know:');
    console.log(err.message ? err.message : 'absolutely nothing (an unknown error occurred).');
};

exports.command = 'delete';
exports.desc = 'Delete a site';
exports.handler = (argv) => {
    let siteName = null;
    console.log(`Deleting a site is a destructive operation that CANNOT be undone. 
The operation will remove all resources associated with your site, 
and it will no longer be accessible/available to you.`);
    getSiteName('Name of site to delete:')
        .then(x => {
            siteName = x.site_name;
            return getSiteName('Please type the name of the site again:')
                .then(y => {
                    if (siteName !== y.site_name) throw new Error('Error: the names don\'t match.');

                    console.log('Please wait...');
                })
        })
        .then(() => auth(argv.accessKey, argv.secretKey))
        .then(auth_params => deleteSite(siteName, auth_params))
        .then(() => console.log('Site successfully deleted.'))
        .catch(err => error(err));
};
