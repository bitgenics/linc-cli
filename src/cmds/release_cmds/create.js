'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const auth = require('../../auth');

const LINC_API_SITES_ENDPOINT = 'https://aduppa8es1.execute-api.us-west-2.amazonaws.com/v0/sites';

const askReleaseInfo = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            site_name: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-z]+[a-z0-9-]*$/,
                description: colors.green('Site name for release:'),
                required: true
            },
            deploy_key: {
                // Only a-z, 0-9 and - are allowed. Must start with a-z.
                pattern: /^[a-f0-9]+$/,
                description: colors.green('Deploy key for release:'),
                required: true
            },
            domain_name: {
                // Fairly good regex for domain name.
                pattern: /^([a-z0-9-]{1,63}\.)*[a-z0-9-]{1,63}\.[a-z0-9-]{2,63}$/,
                description: colors.green('Domain name for release:'),
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

const createNewRelease = (site_name, deploy_key, domain_name, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'PUT',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/deployments/${deploy_key}/releases`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: `{ "domainName": "${domain_name}" }`
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });

});

const error = (err) => {
    console.log('\nOops! Something went wrong, and your site could not be created. Here\'s what we know:');
    console.log(err);
};

exports.command = 'create';
exports.desc = 'Create an account';
exports.handler = (argv) => {
    let siteName = null;
    let deployKey = null;
    let domainName = null;
    askReleaseInfo(true)
        .then(result => {
            siteName = result.site_name;
            deployKey = result.deploy_key;
            domainName = result.domain_name;
            console.log('Please wait...');
        })
        .then(() => auth(argv.accessKey, argv.secretKey))
        .then(auth_params => createNewRelease(siteName, deployKey, domainName, auth_params))
        .then(() => console.log('Release successfully created.'))
        .catch(err => error(err));
};
