const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Install selected profile package
 * @param pkgName
 * @param opts [optional]
 */
module.exports = (pkgName, opts) => new Promise((resolve, reject) => {
    const { force } = opts || { force: false };
    if (!force) {
        const pkg = path.join(process.cwd(), 'node_modules', pkgName);
        if (fs.existsSync(pkg)) {
            // Already installed
            return resolve();
        }
    }

    const command = fs.existsSync(path.join(process.cwd(), 'yarn.lock'))
        ? `yarn add ${pkgName} -D` : `npm i ${pkgName} -D`;

    return exec(command, { cwd: process.cwd() }, (err) => {
        if (err) return reject(err);

        return resolve();
    });
});
