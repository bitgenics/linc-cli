'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');
const request = require('request');
const cred = require('../../cred');
const config = require('../../config.json');

const LINC_API_USERS_ENDPOINT = config.Api.LincBaseEndpoint + '/users';

const getUserEmail = () => new Promise((resolve, reject) => {

    const schema = {
        properties: {
            email: {
                // Fairly good pattern for email addresses
                pattern: /[a-zA-Z0-9%-.+_]+\@[a-zA-Z0-9%-.+_]+\.[a-zA-Z]{2,}/,
                description: colors.green('Your email address:'),
                message: 'Please enter a valid email address.',
                required: true
            }
        }
    };

    prompt.message = colors.green('(linc) ');
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
        url: LINC_API_USERS_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        body: `{ "email": "${email}" }`
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);

        return resolve(json);
    });
});

const showUserCredentials = (response) => {
    const email = response.email;
    const accessKey = response.clientId;
    const secretKey = response.clientSecret;
    const msg = `
Thank you for signing up. You used the following email address:
  + ${email}.
Please check your inbox for a verification email and click on the link to ensure
you can actually log in. (Don't forget to look in your spam folder, just in case.)
Here are your credentials that you need to log in:
  + Access Key: ${accessKey}
  + Secret Key: ${secretKey}
  
We have stored your login information in ~/.linc/credentials which will be used 
to log you in automatically in the future.

!!! Important notice !!!
Please also store these credentials in a safe place. We do not store them on our
servers, so it's impossible for us to retrieve them should you lose them.`;

    console.log(msg);
};

exports.command = 'create';
exports.desc = 'Create an account';
exports.handler = (argv) => {
    getUserEmail()
        .then(email => createNewUser(email))
        .then(apiResponse => {
            showUserCredentials(apiResponse);
            cred.save(apiResponse.clientId, apiResponse.clientSecret)
        })
        .catch(err => console.log(err));
};
