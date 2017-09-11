'use strict';
const _ = require('underscore');
const request = require('request');
const config = require('../config.json');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

/**
 * Get available releases
 * @param site_name
 * @param authInfo
 */
const getAvailableReleases = (site_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/releases`,
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
        if (!json.releases || json.releases.length === 0) return reject('No releases available. Add domain names using \'linc domain add\'.');

        return resolve(json);
    });
});

/**
 * Show available releases
 * @param results
 */
const showAvailableReleases = (results) => {
    const releases = _.sortBy(results.releases, x => x.url);
    const site_name = results.site_name;

    console.log(`Here are the available releases for ${site_name}:`);
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

module.exports = {
    getAvailableReleases,
    showAvailableReleases,
};
