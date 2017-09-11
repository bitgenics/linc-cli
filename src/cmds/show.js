'use strict';
const logUpdate = require('log-update');
const assertPkg = require('../lib/package-json').assert;
const auth = require('../auth');
const domains = require('../lib/domains');
const notice = require('../lib/notice');

const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err.message);
};

const show = (argv) => {
    if (argv.siteName === undefined) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    console.log(`The current site is: ${argv.siteName}`);
    logUpdate('Please wait...');

    let authParams = null;
    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => {
            authParams = auth_params;
            logUpdate.clear();
            logUpdate('Please wait...');
            return domains.getAvailableDomains(argv.siteName, authParams);
        })
        .then(result => {
            logUpdate.clear();
            return domains.showAvailableDomains(result);
        })
        .then(() => {
            logUpdate('Please wait...');
            return getAvailableReleases(argv.siteName, authParams);
        })
        .then(result => {
            logUpdate.clear();

            return showAvailableReleases(result);
        })
        .catch(err => {
            logUpdate.clear();

            error(err);
        });
};

exports.command = 'show';
exports.desc = 'Show information about your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    show(argv);
};
