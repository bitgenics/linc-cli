"use strict";
const colors = require('colors/safe');
const prompt = require('prompt');
const cred = require('./cred');
const auth = require('./auth');

const credentialsFromPrompt = () => new Promise((resolve, reject) => {

    const schema = {
        properties: {
            accessKey: {
                description: colors.white('Access key'),
                required: true
            },
            secretKey: {
                description: colors.white('Secret key:'),
                hidden: true
            }
        }
    };

    prompt.message = colors.grey('(linc) ');
    prompt.delimiter = '';

    prompt.start();

    prompt.get(schema, (err, result) => {
        if (err) {
            return reject(err);
        } else {
            return resolve({
                accessKey: result.accessKey,
                secretKey: result.secretKey
            });
        }
    })
});

let login = (silent) => new Promise((resolve, reject) => {
    const success = (t) => {
        if (! silent) {
            console.log('You have successfully logged in');
        }
        return resolve(t);
    };

    cred.login()
        .then(x => auth(x.accessKey, x.secretKey))
        .then(y => success(y))
        .catch(() => {
            cred.rm()
                .then(() => credentialsFromPrompt())
                .then(q => cred.save(q.accessKey, q.secretKey))
                .then(() => cred.login())
                .then(z => auth(z.accessKey, z.secretKey))
                .then(r => success(r))
                .catch(err => reject(err))
        });
});

module.exports = login;
