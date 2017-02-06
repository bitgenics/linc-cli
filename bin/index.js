#!/usr/bin/env node
'use strict';
const yargs = require('yargs');
const login = require('../lib/login/');
const deploy = require('../lib/deploy/');
const user = require('../lib/user/');
const build = require('../lib/build');
const serve = require('../lib/serve');

const argv = yargs
    .command("adduser", "Add a user.", {}, argv => user.add())
    .command("deploy", "Deploy a site.", {}, argv => deploy())
    .command("login", "Log in.", {}, argv => login(false))
    .command("build", "Build a SSR package", {}, argv => build())
    .command("serve", "Run a HTTP server with SSR", {}, argv => serve())
    .demand(1)
    .help("h")
    .alias("h", "help")
    .argv;
