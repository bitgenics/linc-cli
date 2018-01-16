const _ = require('underscore');
const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config.json');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

/**
 * Create a new release in the back end
 * @param siteName
 * @param deployKey
 * @param domainName
 * @param envName
 */
const createRelease = (siteName, deployKey, domainName, envName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/releases`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
            domainName,
            deployKey,
            envName,
        }),
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

/**
 * Get available releases
 * @param siteName
 */
const getAvailableReleases = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/releases`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (!json.releases || json.releases.length === 0) {
            return reject('No releases available. Add domain names using \'linc domain add\'.');
        }

        return resolve(json);
    });
});

/**
 * Show available releases
 * @param results
 */
module.exports.showAvailableReleases = (results) => {
    const releases = _.sortBy(results.releases, x => x.url);
    const siteName = results.site_name;

    console.log(`Here are the available releases for ${siteName}:`);
    releases.forEach(d => {
        console.log(`   - ${d.url}`);
        console.log(`       + Released on: ${d.created_at}`);
        console.log(`       + Deploy key: ${d.deploy_key}`);
        if (d.description) {
            console.log(`       + Description: "${d.description}"`);
        }
    });
    console.log('');
};

/**
 * Create a new release
 * @param s - siteName
 * @param d - deployKey
 * @param n - domainName
 * @param e - envName
 */
module.exports.createRelease = (s, d, n, e) => authorisify(createRelease(s, d, n, e));

/**
 * Get available releases
 * @param siteName
 */
module.exports.getAvailableReleases = (siteName) => authorisify(getAvailableReleases(siteName));
