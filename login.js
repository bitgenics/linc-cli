"use strict";
const colors = require('colors/safe');
const prompt = require('prompt');
const cred = require('./cred');
const auth = require('./auth');

const credentialsFromPrompt = () => new Promise((resolve, reject) => {

    const schema = {
        properties: {
            username: {
                description: colors.white('Username (your email address)'),
                required: true
            },
            password: {
                description: colors.white('Password'),
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
                username: result.username,
                password: result.password
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
        .then(x => auth(x.username, x.password))
        .then(y => success(y))
        .catch(() => {
            cred.rm()
                .then(() => credentialsFromPrompt())
                .then(q => cred.save(q.username, q.password))
                .then(() => cred.login())
                .then(z => auth(z.username, z.password))
                .then(r => success(r))
                .catch(err => reject(err))
        });
});

module.exports = login;
