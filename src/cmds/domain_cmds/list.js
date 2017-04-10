'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');

const LINC_API_SITES_ENDPOINT = "https://api.bitgenicstest.com/dev/sites";

const askSiteName = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-z]+[a-z0-9-]*$/,
                description: colors.green('Name of site:'),
                required: true
            }
        }
    };
    prompt.message = colors.magenta('(linc) ');
    prompt.delimiter = '';
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
    })
});

const getAvailableDomains = (site_name, authInfo) => new Promise((resolve, reject) => {
    console.log('Please wait...');
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
        if (!json.domains || json.domains.length === 0) return reject('No domains available.\nAdd a domain first using \'linc domain add\'.');

        return resolve(json);
    });
});

const showAvailableDomains = (results) => {
    const domains = results.domains;
    const site_name = results.site_name;

    console.log(`Here are the most recent domains for ${site_name}:`);
    domains.forEach(d => {
        console.log(`  +- ${d.domain_name}`);
        console.log(`        +- Created at ${d.created_at}`);
    });
    console.log('');
};

const list = (argv) => {
    askSiteName()
        .then(result => {
            const siteName = result.site_name.trim();
            return auth(argv.accessKey, argv.secretKey)
                .then(auth_params => getAvailableDomains(siteName, auth_params))
        })
        .then(result => showAvailableDomains(result))
        .catch(err => console.log(`Oops, something went wrong:\n${err}.`));
};

exports.command = 'list';
exports.desc = 'List available domain names';
exports.handler = (argv) => {
    list(argv);
};
