const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config/config.json');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

/**
 * Get available environments
 * @param siteName
 */
const getAvailableEnvironments = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/environments`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

/**
 * Create environment in backend
 * @param settings
 * @param envName
 * @param siteName
 */
const addEnvironment = (settings, envName, siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const body = {
        envName,
        settings,
    };
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/environments`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
        body: JSON.stringify(body),
    };
    request(options, (err, response, _body) => {
        if (err) return reject(err);

        const json = JSON.parse(_body);
        if (json.error) return reject(json.error);
        if (response.statusCode !== 200) return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));

        return resolve(json);
    });
});

/**
 * Delete environment in backend
 * @param envName
 * @param siteName
 */
const deleteEnvironment = (envName, siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'DELETE',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/environments/${envName}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (response.statusCode !== 200) return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));

        return resolve(json);
    });
});

/**
 * Update environment
 * @param settings
 * @param envName
 * @param siteName
 */
const updateEnvironment = (settings, envName, siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const body = {
        settings,
    };
    const options = {
        method: 'PUT',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/environments/${envName}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
        body: JSON.stringify(body),
    };
    request(options, (err, response, _body) => {
        if (err) return reject(err);

        const json = JSON.parse(_body);
        if (json.error) return reject(json.error);
        if (response.statusCode !== 200) return reject(new Error(`${response.statusCode}: ${response.statusMessage}`));

        return resolve(json);
    });
});

/**
 * Show available environments
 * @param results
 */
module.exports.showAvailableEnvironments = (results) => {
    const { environments } = results;
    const siteName = results.site_name;

    console.log(`Here are the available environments for ${siteName}:`);

    let code = 65; /* 'A' */
    environments.forEach(e => console.log(`${String.fromCharCode(code++)})  ${e.name || 'prod'}`));
};

/**
 * Get available environments
 * @param siteName
 */
module.exports.getAvailableEnvironments = (siteName) => authorisify(getAvailableEnvironments(siteName));

/**
 * Add new environment
 * @param s - settings
 * @param e - envName
 * @param n - siteName
 */
module.exports.addEnvironment = (s, e, n) => authorisify(addEnvironment(s, e, n));

/**
 * Delete environment
 * @param e - envName
 * @param s - siteName
 */
module.exports.deleteEnvironment = (e, s) => authorisify(deleteEnvironment(e, s));

/**
 * Update environment
 * @param s - settings
 * @param e - envName
 * @param n - siteName
 */
module.exports.updateEnvironment = (s, e, n) => authorisify(updateEnvironment(s, e, n));
