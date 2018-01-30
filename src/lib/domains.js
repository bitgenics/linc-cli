const _ = require('underscore');
const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config/config.json');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

/**
 * Get available domains
 * @param siteName
 */
const getAvailableDomains = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/domains`,
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
        if (json.error) return reject(new Error(json.error));
        if (!json.domains || json.domains.length === 0) {
            return reject(new Error('No domains available. Add domain names using \'linc domain add\'.'));
        }

        return resolve(json);
    });
});

/**
 * Add domain name
 * @param domainName
 * @param envName
 * @param siteName
 */
const addDomainName = (domainName, envName, siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/domains`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
            domainName,
            envName,
        }),
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (response.statusCode !== 200) {
            return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        }

        return resolve(json);
    });
});

/**
 * Show available domains
 * @param results
 */
module.exports.showAvailableDomains = (results) => {
    const domains = _.sortBy(results.domains, x => x.domain_name);
    const siteName = results.site_name;

    console.log(`Here are the available domains for ${siteName}:`);
    domains.forEach(d => { console.log(`   - ${d.domain_name}`); });
    console.log('');
};

/**
 * Get available domains
 * @param siteName
 */
module.exports.getAvailableDomains = (siteName) => authorisify(getAvailableDomains(siteName));

/**
 * Add domain
 * @param d - domainName
 * @param e - envName
 * @param s - siteName
 */
module.exports.addDomain = (d, e, s) => authorisify(addDomainName(d, e, s));
