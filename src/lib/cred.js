/* eslint-disable consistent-return,no-bitwise */
const path = require('path');
const fs = require('fs-extra');
const dotLinc = require('./dot-linc');

const { DOT_LINC_DIR } = dotLinc;
const credentialsFile = path.join(DOT_LINC_DIR, 'credentials');

/**
 * Get credentials
 */
const load = () => new Promise((resolve, reject) => {
    if (!fs.existsSync(credentialsFile)) return reject(new Error('No credentials file found.'));

    if ((fs.statSync(credentialsFile).mode & 0o777) !== 0o600) {
        console.log(`WARNING: permissions of credentials file ${credentialsFile} may have been tampered with.`);
        process.exit(255);
    }

    const credentials = fs.readJSONSync(credentialsFile, { throws: false });
    if (!credentials.accessKey || !credentials.secretKey) return reject(new Error('No credentials found in file.'));
    return resolve(credentials);
});

/**
 * Save credentials
 * @param accessKey
 * @param secretKey
 */
const save = (accessKey, secretKey) => new Promise((resolve, reject) => {
    const credentials = {
        accessKey,
        secretKey,
    };

    dotLinc.ensureDir()
        .then(() => fs.exists(credentialsFile))
        .then((x) => {
            if (x) {
                // We don't overwrite an existing file
                return resolve();
            }
        })
        .then(() => fs.writeJson(credentialsFile, credentials))
        .then(() => fs.chmod(credentialsFile, 0o600))
        .then(() => resolve())
        .catch(err => reject(err));
});

module.exports = {
    load,
    save,
};
