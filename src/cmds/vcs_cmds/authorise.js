'use strict';
const prompt = require('prompt');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;
const authBitbucket = require('./authorisers/bitbucket').handler;
const authGithub = require('./authorisers/github').handler;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

exports.command = 'authorise <name>';
exports.desc = 'Authorise and install LINC app in your VCS';
exports.builder = {
    name: {
        alias: 'n',
        describe: 'Name of your VCS. Supported are \'bitbucket\' and \'github\'.',
        demand: true,
    },
};
exports.handler = (argv) => {
    if (!argv.siteName) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    assertPkg();

    notice();

    const name = argv.name;
    if (name === 'bitbucket') return authBitbucket(argv);
    if (name === 'github') return authGithub(argv);

    console.log(`Sorry, I don't recognise the VCS system '${name}'.
Supported VCS systems are: 'bitbucket' and 'github'.
Exiting.`);
};
