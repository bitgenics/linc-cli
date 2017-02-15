"use strict";
const path = require('path');
const toml = require('toml');
const fs = require('fs-promise');

const TOML_FILE = 'linc.toml';
const CONFIG_TOML = path.resolve(process.cwd(), `./${TOML_FILE}`);

const load = () => new Promise((resolve, reject) => {
    fs.exists(CONFIG_TOML)
        .then(x => x ? x : reject(`${TOML_FILE} not found in this directory.`))
        .then(() => fs.readFile(CONFIG_TOML, 'utf8'))
        .then(data => resolve(toml.parse(data)))
        .catch(err => reject('Something went wrong'));
});


// This function needs to become comprehensive ultimately
const test = (configuration, silent) => new Promise((resolve, reject) => {
    if (silent === undefined) silent = true;

    const ok = () => {
        if (! silent) console.log('All good');
       return resolve();
    };
    const error = (err) => {
        if (! silent) console.log(err);
        return reject(err);
    };

    if (!configuration.site) return error('site missing (mandatory)');
    else if (!configuration.site.name) return error('site name missing (mandatory)');
    else if (!configuration.site.srcdir) return error('site srcdir missing (mandatory)');
    else return ok('All good');
});

module.exports = {
    load: load,
    test: test
};
