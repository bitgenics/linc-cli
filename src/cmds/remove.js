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

const getSiteName = (message) => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Cannot start/end with -.
                pattern: /^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/,
                description: message,
                message: 'Only a-z, 0-9 and - are allowed. Cannot start/end with -.',
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

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        else if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);
        else return resolve(json);
    });
});

const error = (err) => {
    console.log(`\nOops! Something went wrong: ${err.message}`);
};

const remove = (argv) => {
    let siteName = null;

    assertPkg();

    notice();

    console.log(`Removing a site is a destructive operation that CANNOT be undone. 
The operation will remove all resources associated with your site, 
and it will no longer be accessible/available to you.
`);
    getSiteName('Name of site to remove:')
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
        .then(() => console.log(
`Site successfully removed. You can no longer access this site. Please be
advised that it takes a while for the process to finish on our servers, 
during which time you can't create a new site with the same name.
`))
        .catch(err => error(err));
};

exports.command = 'remove';
exports.desc = 'Remove your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    remove(argv);
};
