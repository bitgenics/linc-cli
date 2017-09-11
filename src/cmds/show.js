'use strict';
const assertPkg = require('../lib/package-json').assert;
const auth = require('../auth');
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

    console.log('Please wait...');

    let authParams = null;
    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => {
            authParams = auth_params;

        })
        .catch(err => error(err));
};

exports.command = 'show';
exports.desc = 'Show information about your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    show(argv);
};
