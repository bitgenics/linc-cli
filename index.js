'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const yargs = require('yargs');
const auth = require('./auth');
const cred = require('./cred');
const config = require('./config');

const USAGE = "Usage: linc <command>\n\n"
    + "Commands:\n"
    + "   login - login (you might need to re-enter your credentials)\n"
    + "   deploy - deploy your site (requires config.linc in your project directory)\n"
    ;

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

const login = (silent) => new Promise((resolve, reject) => {
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

const deploy = () => {
    var params = {};
    login(true)
        .then(() => config.load())
        .then(doc => params = doc)
        .then(() => console.log(JSON.stringify(params)))
        .catch(err => console.log('An error occurred. Are you logged in? (Try \'linc login\'.)'));
};

var argv = yargs
    .usage(USAGE)
    .demand(1)
    .argv;

switch (argv._[0]) {
    case 'login':
        return login(false);

    case 'deploy':
        return deploy();

    default:
        console.log(USAGE);
        break;
}
