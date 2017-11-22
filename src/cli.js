#!/usr/bin/env node
'use strict';
const fs = require('fs');
const yargs = require('yargs');
const fileCredentials = require('./cred.js').getCredentials();

// Get LINC specific variables from environment
const linc_keys = Object.keys(process.env).filter((key) => key.startsWith('LINC_'));
const envConfig = {};
linc_keys.forEach((key) => envConfig[key.toLowerCase().substring(5)] = process.env[key]);

// Create config object to pass into yargs
const configObject = Object.assign({}, fileCredentials, envConfig);

const argv = yargs
    .commandDir('cmds')
    .config(configObject)
    .pkgConf('linc', process.cwd())
    .demand(1)
    .help("help")
    .alias("h", "help")
    .version()
    .argv;
