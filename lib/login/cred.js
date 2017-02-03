"use strict";
const fs = require('fs-promise');
const homedir = require('homedir');

const LINC_DIR = homedir() + '/.linc';
const CRED_FILE = 'credentials';

const credentials = LINC_DIR + '/' + CRED_FILE;

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
            if (! data.hasOwnProperty('User')) {
                return reject('Invalid file format');
            }
            return resolve(data.User);
        })
        .catch(err => reject(err));
});

const rm = () => new Promise((resolve, reject) => {
    fs.exists(credentials)
        .then((x) => {
            if (!x) {
                return resolve();
            }
        })
        .then(() => fs.unlink(credentials))
        .then(() => resolve())
        .catch(() => resolve())
});

const save = (username, password) => new Promise((resolve, reject) => {
    const json = {
        User: {
            username: username,
            password: password
        }
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
    login,
    save,
    rm
};
