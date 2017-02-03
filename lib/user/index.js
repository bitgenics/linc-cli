'use strict';
const colors = require('colors/safe');
const prompt = require('prompt');

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
        if (err) {
            return reject(err);
        } else {
            return resolve({
                email: result.email
            });
        }
    })
});

const add = (argv) => {
    getUserCredentials()
        .then(x => console.log(JSON.stringify(x, null, 2)))
        .catch(err => console.log(err));
};

module.exports = {
    add: add
};
