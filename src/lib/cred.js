/* eslint-disable consistent-return,no-bitwise */
const path = require('path');
const fs = require('fs');
const fsp = require('fs-promise');
const homedir = require('homedir');

const LINC_DIR = path.resolve(homedir(), '.linc');
const credentials = path.resolve(LINC_DIR, 'credentials');

/**
 * Get credentials
 */
const getCredentials = () => {
    try {
        if (fs.existsSync(credentials)) {
            if ((fs.statSync(credentials).mode & 0o777) === 0o600) {
                const json = JSON.parse(fs.readFileSync(credentials));
                return json.User ? json.User : {};
            }

            console.log(`WARNING: permissions of credentials file ${credentials} has been tampered with.`);
        }
        return {};
    } catch (e) {
        console.log(`Error happened while parsing credentials file ${credentials}\n${e}`);
    }
};

/**
 * Log user in
 */
const login = () => new Promise((resolve, reject) => {
    fsp.exists(credentials)
        .then(x => {
            if (!x) {
                return reject('File does not exist');
            }
        })
        .then(() => fsp.stat(credentials))
        .then(stats => stats.mode)
        .then((mode) => {
            if ((mode & 0x1ff) !== 0x180) {
                return reject('File permissions not 0600');
            }
        })
        .then(() => fsp.readJson(credentials))
        .then(data => {
            if (!data.User) return reject('Invalid file format');

            return resolve(data.User);
        })
        .catch(err => reject(err));
});

/**
 * Remove credentials
 */
const rm = () => new Promise((resolve) => {
    fsp.exists(credentials)
        .then((x) => {
            if (!x) {
                return resolve();
            }
        })
        .then(() => fsp.unlink(credentials))
        .then(() => resolve())
        .catch(() => resolve());
});

/**
 * Save credentials
 * @param accessKey
 * @param secretKey
 */
const save = (accessKey, secretKey) => new Promise((resolve, reject) => {
    const json = {
        User: {
            accessKey,
            secretKey,
        },
    };

    fsp.ensureDir(LINC_DIR)
        .then(() => fsp.exists(credentials))
        .then((x) => {
            if (x) {
                // We don't overwrite an existing file
                return resolve();
            }
        })
        .then(() => fsp.writeJson(credentials, json))
        .then(() => fsp.chmod(credentials, 0o600))
        .then(() => resolve())
        .catch(err => reject(err));
});

module.exports = {
    getCredentials,
    login,
    save,
    rm,
};
