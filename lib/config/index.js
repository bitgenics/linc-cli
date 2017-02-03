"use strict";
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs-promise');

const CONFIG_FILE = path.resolve(process.cwd(), './config.linc');

const load = () => new Promise((resolve, reject) => {
    fs.exists(CONFIG_FILE)
        .then(x => !x ? reject('config.linc not found in this directory.') : x)
        .then(() => fs.readFile('./config.linc', 'utf8'))
        .then(data => yaml.safeLoad(data))
        .then(doc => resolve(doc))
        .catch(err => reject(err));
});

module.exports = {
    load: load
};
