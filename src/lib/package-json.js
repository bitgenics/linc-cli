'use strict';
const fs = require('fs');

const PACKAGE_JSON = 'package.json';

const assertPackageJsonExists = () => {
    if (!packageJsonExists()) {
        console.log('This is not an npm project (package.json is missing).');
        process.exit(255);
    }
};

const packageJsonExists = () => {
    return fs.existsSync(PACKAGE_JSON);
};

const readPackageJson = (filename) => new Promise((resolve, reject) => {
    fs.readFile(PACKAGE_JSON, 'utf-8', (err, data) => {
        if (err) return reject(err);
        else return resolve(JSON.parse(data));
    });
});

module.exports = {
    assert: assertPackageJsonExists,
    exists: packageJsonExists,
    read: readPackageJson
};
