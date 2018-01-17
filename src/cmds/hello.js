const ora = require('ora');
const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config/config.json');

const LINC_API_HELLO_ENDPOINT = `${config.Api.LincBaseEndpoint}/hello`;

/**
 * Handle hello
 */
const hello = () => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: LINC_API_HELLO_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (!err && response.statusCode === 200) {
            const obj = JSON.parse(body);
            return resolve(obj);
        }

        return reject(err);
    });
});

exports.command = ['hello'];
exports.desc = false;
exports.handler = () => {
    const spinner = ora('Please wait...').start();

    authorisify(hello())
        .then(body => spinner.succeed(`${body.response}\n`))
        .catch(err => spinner.fail(`Error: ${err.message ? err.message : err}`));
};
