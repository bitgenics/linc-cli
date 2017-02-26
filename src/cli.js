#!/usr/bin/env node
'use strict';
const fs = require('fs');
const yargs = require('yargs');
const toml = require('toml');

const argv = yargs
    .commandDir('cmds')
    .config('config', 'Config file name', (configPath) => {
        const fileCredentials = require('./cred.js').getCredentials();
        const linc_keys = Object.keys(process.env).filter((key) => key.startsWith('LINC_'));
        const envConfig = {};
        linc_keys.forEach((key) => envConfig[key.toLowerCase().substring(5)] = process.env[key]);
        const fileConfig = fs.existsSync(configPath) ? toml.parse(fs.readFileSync(configPath)) : {};
        return Object.assign({}, fileConfig, fileCredentials, envConfig);
    })
    .global(['config', 'silent'])
    .default({config: 'linc.toml', silent: false})
    .demand(1)
    .help("help")
    .alias("h", "help")
    .version()
    .argv;