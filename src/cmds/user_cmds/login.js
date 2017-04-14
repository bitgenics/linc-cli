"use strict";
const colors = require('colors/safe');
const prompt = require('prompt');
const cred = require('../../cred');
const auth = require('../../auth');

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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
    prompt.delimiter = '';

    prompt.start();

    prompt.get(schema, (err, result) => {
        if (err) {
            return reject(err);
        } else {
            return resolve({
                access_key_id: result.access_key_id,
                secret_access_key: result.secret_access_key
            });
        }
    })
});

let login = (argv) => new Promise((resolve, reject) => {
    const success = (t) => {
        if (! argv.silent) {
            console.log('You have successfully logged in');
        }
        return resolve(t);
    };

    credentialsFromPrompt()
    	.then(z => auth(z.access_key_id, z.secret_access_key))
    	.then(() => cred.rm())
    	.then(q => cred.save(q.access_key_id, q.secret_access_key))
    	.then(r => success(r))
    	.catch(err => reject(err));
});

exports.command = 'login';
exports.desc = 'Log in to Linc';
exports.handler = (argv) => {
	login(argv.silent).catch((err) => {console.log(err)});
};
