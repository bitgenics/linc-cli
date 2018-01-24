const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config/config.json');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

/**
 * Check authorisation
 * @param siteName
 */
const authoriseSite = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(new Error('Unauthorised access or invalid site.'));

        return resolve();
    });
});

/**
 * Create new site in back end
 * @param linc
 * @param method
 */
const createSite = (linc, method) => (jwtToken) => new Promise((resolve, reject) => {
    const body = {
        name: linc.siteName,
        settings: {
            description: linc.description,
            viewer_protocol: linc.viewerProtocol,
            domains: linc.domains,
        },
    };
    const options = {
        method: (method === 'CREATE') ? 'POST' : 'PUT',
        url: LINC_API_SITES_ENDPOINT + (method === 'UPDATE' ? `/${linc.siteName}` : ''),
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
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
 * Delete site
 * @param siteName
 */
const deleteSite = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'DELETE',
        url: LINC_API_SITES_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
        body: `{"site_name":"${siteName}"}`,
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(new Error(json.error));
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        return resolve(json);
    });
});

/**
 * Invalidate cache in backend
 * @param siteName
 * @param pattern
 */
const invalidateCache = (siteName, pattern) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/invalidations`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ pattern }),
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

/**
 * Authorise site
 * @param siteName
 */
module.exports.authoriseSite = (siteName) => authorisify(authoriseSite(siteName));

/**
 * Create site
 * @param linc
 * @param method
 */
module.exports.createSite = (linc, method) => authorisify(createSite(linc, method));

/**
 * Delete site
 * @param siteName
 */
module.exports.deleteSite = (siteName) => authorisify(deleteSite(siteName));

/**
 * Invalidate site cache
 * @param siteName
 * @param pattern
 */
module.exports.invalidateCache = (siteName, pattern) => authorisify(invalidateCache(siteName, pattern));
