'use strict';
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const notice = require('../../lib/notice');
const config = require('../../config.json');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

const getAuthoriseUri = (site_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/authorise_uri`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        }
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (!json.authorise_uri) return reject('No authorisation_uri in response.');

        return resolve(json.authorise_uri);
    });
});

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

exports.command = 'authorise';
exports.desc = 'Authorise LINC and install LINC app in your Slack';
exports.handler = (argv) => {
    if (argv.siteName === undefined) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    assertPkg();

    notice();

    console.log('Please wait...');

    auth(argv.accessKey, argv.secretKey)
        .then(authParams => getAuthoriseUri(argv.siteName, authParams))
        .then(uri => console.log(`
Please follow this link to integrate the LINC Slack app in your team Slack:

${uri}

Either click on the link or copy the link into your browser's address bar.
On Linux, you may need to press the Ctrl key, then click on the link.
`))
        .catch(err => console.log(`Oops, something went wrong:\n${err}.`));
};
