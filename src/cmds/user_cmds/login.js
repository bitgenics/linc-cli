"use strict";
const colors = require('colors/safe');
const prompt = require('prompt');
const cred = require('../../cred');
const auth = require('../../lib/auth');
const notice = require('../../lib/notice');

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask for user credentials
 */
const credentialsFromPrompt = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            access_key_id: {
                description: colors.white('Access key:'),
                required: true
            },
            secret_access_key: {
                description: colors.white('Secret key:'),
                hidden: true
            }
        }
    };

    prompt.message = colors.grey('(linc) ');

    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve({
            access_key_id: result.access_key_id,
            secret_access_key: result.secret_access_key
        });
    })
});

const success = () => {
    console.log(`
You have successfully logged in.
`);
};

/**
 * Log in user
 */
const login = () => new Promise((resolve, reject) => {
    notice();

    let credentials;
    credentialsFromPrompt()
    	.then(creds => {
    	    credentials = creds;
    	    return auth(creds.access_key_id, creds.secret_access_key);
        })
    	.then(() => cred.rm())
    	.then(() => cred.save(credentials.access_key_id, credentials.secret_access_key))
    	.then(resolve)
    	.catch(reject);
});

exports.command = 'login';
exports.desc = 'Log in';
exports.handler = (argv) => {
	login()
        .then(success)
        .catch(console.log);
};
