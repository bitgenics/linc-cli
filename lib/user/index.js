'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');

const LINC_API_ENDPOINT = 'https://aduppa8es1.execute-api.us-west-2.amazonaws.com/v0/users';

const getUserCredentials = () => new Promise((resolve, reject) => {

    const schema = {
        properties: {
            email: {
                // Fairly good pattern for email addresses
                pattern: /[a-zA-Z0-9%-.+_]+\@[a-zA-Z0-9%-.+_]+\.[a-zA-Z]{2,}/,
                description: colors.white('Your email address:'),
                required: true
            }
        }
    };

    prompt.message = colors.grey('(linc) ');
    prompt.delimiter = '';

    prompt.start();

    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result.email);
    })
});

const createNewUser = (email) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: LINC_API_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        body: `{ "email": "${email}" }`
    };

    request(options, (err, response, body) => {
        if (err) return reject(err);
        else return resolve(JSON.parse(body));
    });
});

const add = (argv) => {
    getUserCredentials()
        .then(x => createNewUser(x))
        .then(y => console.log(y))
        .catch(err => console.log(err));
};

module.exports = {
    add: add
};
