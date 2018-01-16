/* eslint-disable max-len */
const request = require('request');
const authorisify = require('../../../lib/authorisify');
const config = require('../../../config/config.json');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

/**
 * Create webhook by calling appropriate API endpoint
 * @param siteName
 * @param serviceName
 * @param body
 */
const createWebhook = (siteName, serviceName, body) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/hooks/${serviceName}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(body),
    };
    return request.post(options, (err, response, _body) => {
        if (err) return reject(err);

        const json = JSON.parse(_body);
        if (json.error) return reject(new Error(json.error));
        if (response.statusCode !== 200) {
            return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        }

        return resolve(json);
    });
});

/**
 * Delete webhook in backend
 * @param siteName
 * @param serviceName
 */
const deleteWebhook = (siteName, serviceName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/hooks/${serviceName}`,
        headers: {
            Authorization: `Bearer ${jwtToken}`,
        },
    };
    return request.delete(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        if (response.statusCode !== 200) {
            return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        }

        return resolve(json);
    });
});

/**
 * Create webhook
 * @param siteName
 * @param serviceName
 * @param body
 */
module.exports.createWebhook = (siteName, serviceName, body) => authorisify(createWebhook(siteName, serviceName, body));

/**
 * Delete webhook
 * @param siteName
 * @param serviceName
 */
module.exports.deleteWebhook = (siteName, serviceName) => authorisify(deleteWebhook(siteName, serviceName));
