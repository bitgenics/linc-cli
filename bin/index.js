'use strict';
const yargs = require('yargs');
const login = require('../lib/login/');
const deploy = require('../lib/deploy/');
const user = require('../lib/user/');

const argv = yargs
    .command("adduser", "Add a user.", {}, argv => user.add())
    .command("deploy", "Deploy a property.", {}, argv => deploy())
    .command("login", "Log in.", {}, argv => login(false))
    .demand(1)
    .help("h")
    .alias("h", "help")
    .argv;
