'use strict';
const request = require('request');
const config = require('../config.json');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

/**
 * Get available domains
 * @param site_name
 * @param authInfo
 */
const getAvailableDomains = (site_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/domains`,
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
        if (!json.domains || json.domains.length === 0) return reject('No domains available. Add domain names using \'linc domain add\'.');

        return resolve(json);
    });
});

/**
 * Show available domains
 * @param results
 */
const showAvailableDomains = (results) => {
    const domains = results.domains;
    const site_name = results.site_name;

    console.log(`Here are the available domains for ${site_name}:`);
    domains.forEach(d => { console.log(`   - ${d.domain_name}`); });
    console.log('');
};

module.exports = {
    getAvailableDomains,
    showAvailableDomains,
};
