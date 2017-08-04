'use strict';
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');
const notice = require('../../lib/notice');
const config = require('../../config.json');
const openurl = require('openurl');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = `${config.Api.OAuthEndpoint}/authorise_uri`;

/**
 * Get URL to authorise with Bitbucket
 * @param site_name
 * @param authInfo
 */
const getAuthoriseUri = (site_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/GitHub`,
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

        return resolve(json);
    });
});

/**
 * Ask whether user is sure
 */
const areYouSure = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            ok: {
                description: "You are already authorised. Authorise again?",
                default: 'Y',
                type: 'string'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    });
});

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

exports.command = 'authorise';
exports.desc = 'Authorise LINC and install LINC app in your GitHub';
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
        .then(response => {
            if (!response.already_authorised) return response.authorise_uri;

            return areYouSure()
                .then(result => {
                    if (result.ok.toLowerCase() !== 'y') {
                        console.log('Okay, not reauthorising. Exiting.');
                        return process.exit(0);
                    }

                    return response.authorise_uri;
                })
        })
        .then(uri => {
            console.log(`
The following URL will open in your browser shortly:

${uri}

If your browser didn't open this URL, please click on the link or copy the link into your browser's address bar. (On Linux, you need to press the Ctrl key and click on the link.)

Please note that this URL will be valid for approx. 30 minutes, after which you need to re-run this command.
`);
            openurl.open(uri, () => {});
        })
        .catch(err => console.log(`Oops, something went wrong:\n${err}.`));
};
