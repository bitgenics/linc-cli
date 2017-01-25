"use strict";
const yaml = require('js-yaml');
const fs = require('fs-promise');


const load = () => new Promise((resolve, reject) => {
    fs.readFile('./config.linc', 'utf8')
        .then(data => yaml.safeLoad(data))
        .then(doc => resolve(doc))
        .catch(err => reject(err));
});

module.exports = {
    load: load
};
