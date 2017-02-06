'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const cred = require('../login/cred');

const LINC_API_ENDPOINT = 'https://aduppa8es1.execute-api.us-west-2.amazonaws.com/v0/users';

const getUserEmail = () => new Promise((resolve, reject) => {

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

const showUserCredentials = (response) => {
    const email = response.email;
    const accessKey = response.clientId;
    const secretKey = response.clientSecret;
    const msg = '\nThank you for signing up. You used the following email address:\n'
        + `  + ${email}.\n`
        + 'Please check your inbox for a verification email, to ensure you can actually log in.\n'
        + 'You must use the following credentials to log in:\n'
        + `  + Access Key: ${accessKey}\n`
        + `  + Secret Key: ${secretKey}\n\n`
        + 'Important notice:\n'
        + 'please store these credentials in a safe place. We do not store you credentials in an way,\n'
        + 'so it\'s impossible for use to retrieve them should you use them.\n';

    console.log(msg);
};

const add = (argv) => {
    getUserEmail()
        .then(email => createNewUser(email))
        .then(apiResponse => {
            showUserCredentials(apiResponse);
            cred.save(apiResponse.clientId, apiResponse.clientSecret)
        })
        .catch(err => console.log(err));
};

module.exports = {
    add: add
};
