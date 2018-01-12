const fs = require('fs');

const PACKAGE_JSON = 'package.json';

const packageJsonExists = () => fs.existsSync(PACKAGE_JSON);

const assertPackageJsonExists = () => {
    if (!packageJsonExists()) {
        console.log('This is not an npm project (package.json is missing).');
        process.exit(255);
    }
};

const readPackageJson = () => new Promise((resolve, reject) => {
    fs.readFile(PACKAGE_JSON, 'utf-8', (err, data) => {
        if (err) return reject(err);

        return resolve(JSON.parse(data));
    });
});

module.exports = {
    assert: assertPackageJsonExists,
    exists: packageJsonExists,
    read: readPackageJson,
};
