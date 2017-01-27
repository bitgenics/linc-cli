"use strict";
const request = require('request');

const login = (username, password) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/oauth/ro',
        json: {
            client_id: 'kr5ZgNFYFOHXCoEkKPquQrgUA3oeRRjV',
            username: username,
            password: password,
            connection: 'Username-Password-Authentication',
            grant_type: 'password',
            scope: 'openid'
        }
    };

    request.post(params, (err, res, body) => {
        if (err) {
            reject(err);
        } else {
            resolve(body);
        }
    })
});

const getAWSCredentials = (id_token) => new Promise((resolve, reject) => {
    const params = {
        url: 'https://bitgenics.auth0.com/delegation',
        json: {
            client_id: 'kr5ZgNFYFOHXCoEkKPquQrgUA3oeRRjV',
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            id_token: id_token,
            target: 'kr5ZgNFYFOHXCoEkKPquQrgUA3oeRRjV',
            api_type: 'aws'
        }
    };

    request.post(params, (err, res, body) => {
        if (err) {
            return reject(err)
        } else {
            return resolve(body);
        }
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
        if (err) {
            return reject(err);
        } else {
            return resolve(body);
        }
    })
});

module.exports = (username, password) => new Promise((resolve, reject) =>  {
    let authParams = {
        jwtToken: null,
        auth0: {},
        aws: {}
    };

    login(username, password)
        .then(json => !json.id_token ? reject('No token found') : authParams.jwtToken = json.id_token)
        .then(token => {
            let p1 = getAWSCredentials(token);
            let p2 = getUserProfile(token);
            Promise.all([p1, p2])
                .then(r => {
                    authParams.aws = { credentials: r[0].Credentials};
                    authParams.auth0 = { profile: r[1]};
                    return resolve(authParams);
                })
                .catch(err => reject(err))
        })
        .catch(err => reject(err));
});
