#!/usr/bin/env node
'use strict';
const yargs = require('yargs');
//const login = require('../lib/login/');
const deploy = require('../lib/deploy/');
//const user = require('../lib/user/');
const site = require('../lib/site/');
//const build = require('../lib/build');
//const serve = require('../lib/serve');
//const config = require('../lib/config');

const argv = yargs
    .command("addsite", "Add a site.", {}, argv => site.add())
    //.command("adduser", "Add a user.", {}, argv => user.add())
    //.command("build", "Build a SSR package.", {}, argv => build())
    .command("deploy", "Deploy a site.", {}, argv => deploy())
    .command("delsite", "Remove a site.", {}, argv => site.del())
    //.command("login", "Log in.", {}, argv => login(false))
    //.command("serve", "Run a HTTP server with SSR.", {}, argv => serve())
    //.command("test", "Test the config file", {}, argv => config.load().then(x => config.test(x, false)))
    .fail((_, b) => {
        console.log(b);
    })
    .demand(1)
    .help("h")
    .alias("h", "help")
    .version()
    .argv;
