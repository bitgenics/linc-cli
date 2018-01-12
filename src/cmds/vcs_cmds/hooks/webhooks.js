'use strict';
const request = require('request');
const authorisify = require('../../../lib/authorisify');
const config = require('../../../config.json');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

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
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(body)
    };
    return request.post(options, (err, response, body) => {
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
 * Call API to create webhook
 */
const createWebhookInBackend = (site_name, service, body) => (jwtToken) => new Promise((resolve, reject) => {
    console.log('Please wait...');
    if (body === undefined) {
        body = service;
        service = 'GitHub';
    }
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/webhooks/${service}`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(body)
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        else if (response.statusCode !== 200) return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        else return resolve(json);
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
            'Authorization': `Bearer ${jwtToken}`
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
 * @param argv
 * @param siteName
 * @param serviceName
 * @param body
 */
module.exports.createWebhook = (argv, siteName, serviceName, body) => authorisify(argv, createWebhook(siteName, serviceName, body));

/**
 * Delete webhook
 * @param argv
 * @param siteName
 * @param serviceName
 */
module.exports.deleteWebhook = (argv, siteName, serviceName) => authorisify(argv, deleteWebhook(siteName, serviceName));
