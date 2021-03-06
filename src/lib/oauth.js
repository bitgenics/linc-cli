const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config/config.json');

const LINC_API_OAUTH_ENDPOINT = `${config.Api.OAuthEndpoint}/authorise_uri`;

/**
 * Get URL to authorise with Slack
 * @param siteName
 * @param serviceName
 */
const getAuthoriseUri = (siteName, serviceName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_OAUTH_ENDPOINT}/${siteName}/${serviceName}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) {
            return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        }

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (!json.authorise_uri) {
            return reject(new Error('No authorisation_uri in response.'));
        }

        return resolve(json);
    });
});

/**
 * Get authorise URL for oauth flow
 * @param s - siteName
 * @param n - serviceName
 */
module.exports.getAuthoriseUrl = (s, n) => authorisify(getAuthoriseUri(s, n));
