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
        else return resolve(result.email.trim());
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

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

const showUserCredentials = (response) => {
    const email = response.email;
    const accessKey = response.clientId;
    const secretKey = response.clientSecret;
    const msg = '\nThank you for signing up. You used the following email address:\n'
        + `  + ${email}.\n`
        + 'Please check your inbox for a verification email and click on the link to ensure\n' +
        + 'you can actually log in. (Don\'t forget to look in your spam folder, just in\n'
        + 'case.)\n\n'
        + 'Here are your credentials that you need to log in:\n'
        + `  + Access Key: ${accessKey}\n`
        + `  + Secret Key: ${secretKey}\n\n`
        + 'Important notice:\n'
        + 'please store these credentials in a safe place. We do not store your credentials\n' +
        + 'on our servers, so it\'s impossible for us to retrieve them should you lose them.\n';

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
