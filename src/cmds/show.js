'use strict';
const ora = require('ora');
const assertPkg = require('../lib/package-json').assert;
const auth = require('../auth');
const domains = require('../lib/domains');
const notice = require('../lib/notice');
const releases = require('../lib/releases');

const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err.message);
};

const show = (argv) => {
    if (argv.siteName === undefined) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    console.log(`The current site is: '${argv.siteName}'\n`);

    const spinner = ora('Authorising. Please wait...').start();

    let authParams = null;
    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => {
            authParams = auth_params;
            spinner.stop();

            spinner.text = 'Retrieving data. Please wait...';
            spinner.start();
            return Promise.all([
                domains.getAvailableDomains(argv.siteName, authParams),
                releases.getAvailableReleases(argv.siteName, authParams),
            ]);
        })
        .then(result => {
            spinner.stop();
            domains.showAvailableDomains(result[0]);
            releases.showAvailableReleases(result[1]);
        })
        .catch(err => {
            spinner.stop();

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
