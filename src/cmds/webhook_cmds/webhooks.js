/* eslint-disable no-param-reassign */
const request = require('request');
const authorisify = require('../../lib/authorisify');
const config = require('../../config.json');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

/**
 * Call API to create webhook
 */
const createWebhook = (siteName, serviceName, body) => (jwtToken) => new Promise((resolve, reject) => {
    console.log('Please wait...');
    if (!body) {
        body = serviceName;
        serviceName = 'GitHub';
    }
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/webhooks/${serviceName}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(body),
    };
    request(options, (err, response, _body) => {
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
 * Call API to delete webhook
 */
const deleteWebhook = (siteName, serviceName) => (jwtToken) => new Promise((resolve, reject) => {
    console.log('Please wait...');

    serviceName = serviceName || 'GitHub';
    const options = {
        method: 'DELETE',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/webhooks/${serviceName}`,
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

        return resolve(json);
    });
});

/**
 * Create webhook
 * @param s - siteName
 * @param n - serviceName
 * @param b - body
 */
module.exports.createWebhook = (s, n, b) => authorisify(createWebhook(s, n, b));

/**
 * Delete webhook
 * @param s - siteName
 * @param n - serviceName
 */
module.exports.deleteWebhook = (s, n) => authorisify(deleteWebhook(s, n));
