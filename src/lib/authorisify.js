const fs = require('fs-extra');
const path = require('path');
const auth = require('./auth');
const cred = require('./cred');
const dotLinc = require('../lib/dot-linc');

const DOT_LINC_DIR = dotLinc.DOT_LINC_DIR;

let JwtToken = null;

/**
 * Convenience function to authorise
 */
const authorise = () => {
    cred.load()
        .then(credentials => auth(credentials.accessKey, credentials.secretKey));
};

/**
 * Get jwt token from file in .linc directory
 */
const getJwtToken = () => new Promise((resolve, reject) => {
    if (JwtToken) return resolve(JwtToken);

    try {
        const tokenFile = path.join(DOT_LINC_DIR, 'token');
        const token = fs.readFileSync(tokenFile);
        return resolve(token.toString().trim());
    } catch (e) {
        return reject(e);
    }
});

/**
 * Save jwt token to file in .linc directory
 * @param jwtToken
 */
const saveJwtToken = jwtToken => new Promise((resolve, reject) => {
    JwtToken = jwtToken;

    // Create .linc directory if not already there
    dotLinc.ensureDir();

    try {
        const tokenFile = path.join(DOT_LINC_DIR, 'token');
        fs.writeFileSync(tokenFile, `${jwtToken}\n`);
        return resolve(jwtToken);
    } catch (e) {
        return reject(e);
    }
});

/**
 * Entry point
 * @param func
 */
module.exports = (func) => new Promise((resolve, reject) => {
    let jwtToken;

    /**
     * Convenience function
     * @param token
     */
    const tokenFunc = token => {
        jwtToken = token;
        return func(jwtToken);
    };

    getJwtToken()
        .then(tokenFunc)
        .then(resolve)
        .catch(() => authorise())
        .then(saveJwtToken)
        .then(tokenFunc)
        .then(resolve)
        .catch(reject);
});
