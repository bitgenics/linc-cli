'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const yargs = require('yargs');
const auth = require('./auth');

const login = () => {

    const schema = {
        properties: {
            username: {
                description: colors.white('Username'),
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
            console.log(err);
        }
        else {
            console.log(`Logging in ${result.username}`);
            auth(result.username, result.password)
                .then((x) => console.log(JSON.stringify(x, null, 2)))
                .catch((err) => console.log(err));
        }
    })
};

var argv = yargs
    .usage('Usage: linc login')
    .demand(1)
    .argv;

switch (argv._[0]) {
    case 'login':
        return login();

    default:
        console.log('Usage: linc login');
        break;
}
