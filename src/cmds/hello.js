const request = require('request');
const authorisify = require('../lib/authorisify');
const config = require('../config.json');

const LINC_API_HELLO_ENDPOINT = `${config.Api.LincV2Endpoint}/hello`;

/**
 * Handle hello
 */
const hello = () => (jwtToken) => new Promise((resolve, reject) => {
    const options = {
        method: 'GET',
        url: LINC_API_HELLO_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
        },
    };
    request(options, (err, response, body) => {
        if (!err && response.statusCode === 200) return resolve(body);

        return reject();
    });
});

exports.command = ['hello'];
exports.desc = false;
exports.handler = () => {
    console.log('Please wait...');
    authorisify(hello())
        .then(body => console.log(body.response))
        .catch(err => console.log(`Error:\n${err}`));
};
