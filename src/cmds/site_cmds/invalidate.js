'use strict';
const assertPkg = require('../../lib/package-json').assert;
const auth = require('../../auth');
const config = require('../../config.json');
const notice = require('../../lib/notice');
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Invalidate cache in backend
 * @param site_name
 * @param pattern
 * @param authInfo
 */
const invalidateCache = (site_name, pattern, authInfo) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: `${LINC_API_SITES_ENDPOINT}/${site_name}/invalidations`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authInfo.jwtToken}`
        },
        body: JSON.stringify({ pattern })
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

/**
 * Show error
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err.message);
};

/**
 * Handle invalidate command
 * @param argv
 */
const invalidate = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    let siteName = argv.siteName;

    let pattern = '/*';
    if (argv.pattern) {
        pattern = argv.pattern;
    }

    const spinner = ora('Invalidating cache...').start();
    auth(argv.accessKey, argv.secretKey)
        .then(authInfo => invalidateCache(siteName, pattern, authInfo))
        .then(() => {
            spinner.stop();
            console.log('Done.');
        })
        .catch(err => {
            spinner.stop();
            return error(err);
        });
};

exports.command = 'invalidate [pattern]';
exports.desc = 'Invalidate cache';
exports.handler = (argv) => {
    assertPkg();

    notice();

    invalidate(argv);
};
