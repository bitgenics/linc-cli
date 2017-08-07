'use strict';
const prompt = require('prompt');
const request = require('request');
const auth = require('../../../auth');
const config = require('../../../config.json');
const openurl = require('openurl');

const LINC_API_SITES_ENDPOINT = `${config.Api.OAuthEndpoint}/authorise_uri`;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

module.exports.handler = argv => {
    if (!argv.command) {
        console.log('You failed to provide a command.');
        process.exit(0);
    }

};
