const request = require('request');
const config = require('../config.json');

const ClientId = config.Auth.ClientId;

/**
 * Log in using username and password
 * @param username
 * @param password
 */
const login = (username, password) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/oauth/ro',
        json: {
            client_id: ClientId,
            username,
            password,
            connection: 'Username-Password-Authentication',
            grant_type: 'password',
            scope: 'openid',
        },
    };
    request.post(params, (err, res, body) => {
        if (err) return reject(err);

        return resolve(body);
    });
});

/**
 * Get AWS credentials
 * @param idToken
 */
const getAWSCredentials = (idToken) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/delegation',
        json: {
            client_id: ClientId,
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            id_token: idToken,
            target: ClientId,
            api_type: 'aws',
        },
    };
    request.post(params, (err, res, body) => {
        if (err) return reject(err);

        return resolve(body);
    });
});

/**
 * Retrieve user profile from auth0
 * @param idToken
 */
const getUserProfile = (idToken) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/tokeninfo',
        json: {
            id_token: idToken,
        },
    };
    request.post(params, (err, res, body) => {
        if (err) return reject(err);

        return resolve(body);
    });
});

/**
 * Module entry point
 * @param accessKey
 * @param secretKey
 */
const authorise = (accessKey, secretKey) => new Promise((resolve, reject) => {
    let jwtToken;
    let userId;

    login(accessKey, secretKey)
        .then(json => {
            if (json.error && json.error_description) {
                return reject(new Error(`Error (${json.error}): ${json.error_description}`));
            }
            if (!json.id_token) {
                return reject(new Error('Error: no token found.'));
            }
            jwtToken = json.id_token;
            const p1 = getAWSCredentials(jwtToken);
            const p2 = getUserProfile(jwtToken);
            return Promise.all([p1, p2]);
        })
        .then(r => {
            if (r[0].error && r[0].error_description) {
                return reject(new Error(`Error (${r[0].error}): ${r[0].error_description}`));
            }

            userId = r[1].user_id;
            const aws = {
                accessKeyId: r[0].Credentials.AccessKeyId,
                secretAccessKey: r[0].Credentials.SecretAccessKey,
                sessionToken: r[0].Credentials.SessionToken,
            };
            return resolve({ jwtToken, userId, aws });
        })
        .catch(err => reject(err));
});

/**
 * Main entry point
 * @param accessKey
 * @param secretKey
 */
module.exports = (accessKey, secretKey) => authorise(accessKey, secretKey).then(x => x.jwtToken);

/**
 * Get user ID
 * @param accessKey
 * @param secretKey
 */
module.exports.getExtentedCredentials = authorise;
