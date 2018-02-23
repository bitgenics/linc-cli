const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

/**
 * Run command
 * @param command
 */
const runCommand = (command) => new Promise((resolve, reject) => exec(command, { cwd: process.cwd() }, (err) => {
    if (err) return reject(err);

    return resolve();
}));

/**
 * Install selected profile package
 * @param pkgName
 * @param opts [optional]
 */
module.exports = async (pkgName, opts) => {
    const { force } = opts || { force: false };
    if (!force) {
        const pkg = path.join(process.cwd(), 'node_modules', pkgName);

        // Already installed?
        if (fs.existsSync(pkg)) return;
    }

    const command = fs.existsSync(path.join(process.cwd(), 'yarn.lock'))
        ? `yarn add ${pkgName} -D` : `npm i ${pkgName} -D`;

    await runCommand(command);
};
