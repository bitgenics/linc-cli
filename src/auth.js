"use strict";
const request = require('request');
const config = require('./config.json');

const ClientId = config.Auth.ClientId;

const login = (username, password) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/oauth/ro',
        json: {
            client_id: ClientId,
            username: username,
            password: password,
            connection: 'Username-Password-Authentication',
            grant_type: 'password',
            scope: 'openid'
        }
    };
    request.post(params, (err, res, body) => {
        if (err) return reject(err);
        else return resolve(body);
    })
});

const getAWSCredentials = (id_token) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/delegation',
        json: {
            client_id: ClientId,
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            id_token: id_token,
            target: ClientId,
            api_type: 'aws'
        }
    };
    request.post(params, (err, res, body) => {
        if (err) return reject(err);
        else return resolve(body);
    });
});

const getUserProfile = (id_token) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/tokeninfo',
        json: {
            id_token: id_token
        }
    };
    request.post(params, (err, res, body) => {
        if (err) return reject(err);
        else return resolve(body);
    })
});

module.exports = (accessKey, secretKey) => new Promise((resolve, reject) =>  {
    let authParams = {
        jwtToken: null,
        auth0: {},
        aws: {}
    };

    login(accessKey, secretKey)
        .then(json => {
            if (json.error && json.error_description) {
                return reject(new Error(`Error (${json.error}): ${json.error_description}`));
            } else if (!json.id_token) {
                return reject(new Error('Error: no token found.'));
            }
            authParams.jwtToken = json.id_token;
        })
        .then(() => {
            const token = authParams.jwtToken;
            let p1 = getAWSCredentials(token);
            let p2 = getUserProfile(token);
            Promise.all([p1, p2])
                .then(r => {
                    if (r[0].error && r[0].error_description) {
                        return reject(new Error(`Error (${r[0].error}): ${r[0].error_description}`));
                    }

                    authParams.aws = {
                        credentials: {
                            accessKeyId: r[0].Credentials.AccessKeyId,
                            secretAccessKey: r[0].Credentials.SecretAccessKey,
                            sessionToken: r[0].Credentials.SessionToken
                        }};
                    authParams.auth0 = { profile: r[1] };
                    return resolve(authParams);
                })
                .catch(err => reject(err))
        })
        .catch(err => reject(err));
});
