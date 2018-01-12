'use strict';
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const cred = require('../../cred');
const notice = require('../../lib/notice');
const config = require('../../config.json');

const LINC_API_USERS_ENDPOINT = config.Api.LincBaseEndpoint + '/users';

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user to accept terms and conditions
 */
const getTCAcceptance = () => new Promise((resolve, reject) => {
    console.log(`
In order to use LINC, you'll need to accept the Terms and Conditions.
You can find the Terms and Conditions here: https://bitgenics.io/link/legal
`);
    const schema = {
        properties: {
            accept: {
                description: 'Do you accept the Terms and Conditions:',
                default: 'Y',
                required: true
            }
        }
    };
    prompt.start();

    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result.accept.trim());
    })
});

/**
 * Get user's email
 */
const getUserEmail = () => new Promise((resolve, reject) => {
    console.log(`Thank you for accepting the Terms and Conditions.

Please enter a valid email address. After signing up, you'll receive
an email with a validation link. You'll need to validate your email
address by clicking this link.
`);
    const schema = {
        properties: {
            email: {
                // Fairly good pattern for email addresses
                pattern: /[a-zA-Z0-9%-.+_]+\@[a-zA-Z0-9%-.+_]+\.[a-zA-Z]{2,}/,
                description: 'Your email address:',
                message: 'Please enter a valid email address.',
                required: true
            }
        }
    };

    prompt.start();

    prompt.get(schema, (err, result) => {
        if (err) return reject(err);
        else return resolve(result.email.trim());
    })
});

/**
 * Create new user in back end
 * @param email
 */
const createNewUser = (email) => new Promise((resolve, reject) => {
    const options = {
        method: 'POST',
        url: LINC_API_USERS_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        body: `{ "email": "${email}" }`
    };
    request(options, (err, response, body) => {
        if (err) return reject(err);

        const json = JSON.parse(body);
        if (json.error) return reject(json.error);
        if (response.statusCode !== 200) return reject(`Error ${response.statusCode}: ${response.statusMessage}`);

        return resolve(json);
    });
});

/**
 * Show user credentials
 * @param response
 */
const showUserCredentials = (response) => {
    const email = response.email;
    const accessKey = response.clientId;
    const secretKey = response.clientSecret;
    const msg = `
Thank you for signing up. You used the following email address:
  ${email}
  
IMPORTANT:

Please check your inbox for a verification email and click on the link to ensure
you can actually use LINC. (Don't forget to look in your spam folder, just in case.)
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
    notice();

    const spinner = ora('Creating new user. Please wait...');
    getTCAcceptance()
        .then(accept => {
            if (accept.substr(0, 1).toLowerCase() !== 'y') {
                throw new Error('You must accept the Terms & Conditions to continue. Abort.');
            }

            return getUserEmail();
        })
        .then(email => {
            spinner.start();
            return createNewUser(email);
        })
        .then(apiResponse => {
            spinner.stop();
            showUserCredentials(apiResponse);
            cred.save(apiResponse.clientId, apiResponse.clientSecret)
        })
        .catch(err => {
            spinner.stop();
            console.log(err.message);
        });
};
