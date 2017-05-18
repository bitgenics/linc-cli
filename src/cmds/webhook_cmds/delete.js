'use strict';
const prompt = require('prompt');
const request = require('request');
const notice = require('../../lib/notice');
const config = require('../../config.json');
const readPkg = require('read-pkg');
const assertPkg = require('../../lib/package-json').assert;

const LINC_API_SITES_ENDPOINT = config.Api.LincBaseEndpoint + '/sites';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Delete webhook
 * @param argv
 */
const deleteWebhook = (argv) => {
    console.log('Delete');
};

exports.command = 'delete';
exports.desc = 'Delete a webhook';
exports.handler = (argv) => {
    notice();

    deleteWebhook(argv);
};
