/* eslint-disable consistent-return,no-bitwise */
const path = require('path');
const fs = require('fs-extra');
const dotLinc = require('./dot-linc');

const DOT_LINC_DIR = dotLinc.DOT_LINC_DIR;
const credentialsFile = path.join(DOT_LINC_DIR, 'credentials');

/**
 * Get credentials
 */
const getCredentials = () => {
    try {
        if (fs.existsSync(credentialsFile)) {
            if ((fs.statSync(credentialsFile).mode & 0o777) === 0o600) {
                return JSON.parse(fs.readFileSync(credentialsFile));
            }

            console.log(`WARNING: permissions of credentials file ${credentialsFile} has been tampered with.`);
        }
        return {};
    } catch (e) {
        console.log(`Error happened while parsing credentials file ${credentialsFile}\n${e}`);
    }
};

/**
 * Log user in
 */
const login = () => new Promise((resolve, reject) => {
    fs.exists(credentialsFile)
        .then(x => {
            if (!x) {
                return reject('File does not exist');
            }
        })
        .then(() => fs.stat(credentialsFile))
        .then(stats => stats.mode)
        .then((mode) => {
            if ((mode & 0x1ff) !== 0x180) {
                return reject('File permissions not 0600');
            }
        })
        .then(() => fs.readJson(credentialsFile))
        .then(data => {
            if (!data) return reject('Invalid file format');

            return resolve(data);
        })
        .catch(err => reject(err));
});

/**
 * Remove credentials
 */
const rm = () => new Promise((resolve) => {
    fs.exists(credentialsFile)
        .then((x) => {
            if (!x) {
                return resolve();
            }
        })
        .then(() => fs.unlink(credentialsFile))
        .then(() => resolve())
        .catch(() => resolve());
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
    getCredentials,
    login,
    save,
    rm,
};
