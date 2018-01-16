const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config.json');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

/**
 * Retrieve available deployments from back end
 * @param siteName
 */
const getAvailableDeployments = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/deployments`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        if (response.statusCode !== 200) {
            return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        }
        if (json.deployments.length === 0) {
            return reject(new Error('No deployments available. Deploy your site using \'linc deploy\'.'));
        }

        return resolve(json);
    });
});

/**
 * Get available deployments
 * @param siteName
 */
module.exports.getAvailableDeployments = (siteName) => authorisify(getAvailableDeployments(siteName));
