"use strict";
const request = require('request');

const login = (username, password, cb) => {
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
        const id_token = body.id_token;
        console.log(JSON.stringify(body, null, 2));

        if (id_token) {
            return cb(null, body);
        } else {
            return cb(err || body);
        }
    })
};

const getUserProfile = (id_token, cb) => {
    const params = {
        url: 'https://bitgenics.auth0.com/tokeninfo',
        json: {
            id_token: id_token
        }
    };
    request.post(params, (err, res, body) => {
        if (body.user_id) {
            return cb(null, body);
        } else {
            return err || body;
        }
    })
};

module.exports = (username, password, cb) => {
    login(username, password, (err, authInfo) => {
        if (authInfo) {
            const id_token = authInfo.id_token;
            getUserProfile(id_token, cb);
        } else {
            cb(err);
        }
    })
};
