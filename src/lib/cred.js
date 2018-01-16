/* eslint-disable consistent-return,no-bitwise */
const path = require('path');
const fs = require('fs-extra');
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
    fs.exists(credentials)
        .then(x => {
            if (!x) {
                return reject('File does not exist');
            }
        })
        .then(() => fs.stat(credentials))
        .then(stats => stats.mode)
        .then((mode) => {
            if ((mode & 0x1ff) !== 0x180) {
                return reject('File permissions not 0600');
            }
        })
        .then(() => fs.readJson(credentials))
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
    fs.exists(credentials)
        .then((x) => {
            if (!x) {
                return resolve();
            }
        })
        .then(() => fs.unlink(credentials))
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

    fs.ensureDir(LINC_DIR)
        .then(() => fs.exists(credentials))
        .then((x) => {
            if (x) {
                // We don't overwrite an existing file
                return resolve();
            }
        })
        .then(() => fs.writeJson(credentials, json))
        .then(() => fs.chmod(credentials, 0o600))
        .then(() => resolve())
        .catch(err => reject(err));
});

module.exports = {
    getCredentials,
    login,
    save,
    rm,
};
