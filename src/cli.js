#!/usr/bin/env node
const yargs = require('yargs');

// Get LINC specific variables from environment
const lincKeys = Object.keys(process.env).filter((key) => key.startsWith('LINC_'));
const envConfig = {};
lincKeys.forEach(key => {
    envConfig[key.toLowerCase().substring(5)] = process.env[key];
});

// Create config object to pass into yargs
const configObject = Object.assign({}, envConfig);

// eslint-disable-next-line no-unused-vars
const argv = yargs
    .commandDir('cmds')
    .config(configObject)
    .pkgConf('linc', process.cwd())
    .demand(1)
    .help('help')
    .alias('h', 'help')
    .version()
    .argv;
