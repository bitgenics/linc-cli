const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Install selected profile package
 * @param pkgName
 * @returns {Promise<any>}
 */
const installProfilePkg = (pkgName) => new Promise((resolve, reject) => {
    const command = fs.existsSync(path.join(process.cwd(), 'yarn.lock'))
        ? `yarn add ${pkgName} -D` : `npm i ${pkgName} -D`;

    exec(command, { cwd: process.cwd() }, (err) => {
        if (err) return reject(err);

        return resolve();
    });
});

module.exports = installProfilePkg;
