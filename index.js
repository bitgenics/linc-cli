'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const yargs = require('yargs');
const auth = require('./auth');
const cred = require('./cred');

const USAGE = 'Usage: linc login';

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

const login = () => {
    cred.login()
        .then(x => auth(x.username, x.password))
        .then(response => console.log('You have successfully logged in.'))
        .catch(() => {
            cred.rm()
                .then(() => credentialsFromPrompt())
                .then(y => cred.save(y.username, y.password))
                .then(() => cred.login())
                .then(z => auth(z.username, z.password))
                .then(res => console.log('You have successfully logged in.'))
                .catch(err => console.log('Oops! ' + err))
        });
};

var argv = yargs
    .usage(USAGE)
    .demand(1)
    .argv;

switch (argv._[0]) {
    case 'login':
        return login();

    default:
        console.log(USAGE);
        break;
}
