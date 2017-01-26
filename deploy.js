"use strict";
const config = require('./config');
const login = require('./login');

const deploy = () => {
    let jwtToken = null;
    let params = {};

    const p1 = config.load();
    const p2 = login(true);
    Promise.all([p1, p2])
        .then(r => {
            params = r[0];      // Configuration parameters
            jwtToken = r[1];    // jwt token for authentication
        })
        .catch(err => console.log(err));
};

module.exports = deploy;
