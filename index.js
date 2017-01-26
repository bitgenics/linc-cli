'use strict';
const yargs = require('yargs');
const login = require('./login');
const deploy = require('./deploy');

const argv = yargs
    .command("login", "Log in", {}, argv => login(false))
    .command("deploy", "Deploy a property.", {}, argv => deploy())
    .demand(1)
    .help("h")
    .alias("h", "help")
    .argv;
