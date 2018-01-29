const fs = require('fs-extra');
const path = require('path');
const auth = require('./auth');
const loadCredentials = require('./cred').load;
const dotLinc = require('../lib/dot-linc');

const { DOT_LINC_DIR } = dotLinc;

let JwtToken = null;

/**
 * Convenience function to authorise
 */
const authorise = async () => {
    const credentials = await loadCredentials();
    return auth(credentials.accessKey, credentials.secretKey);
};

/**
 * Get jwt token from file in .linc directory
 */
const getJwtToken = () => {
    if (JwtToken) return JwtToken;

    const tokenFile = path.join(DOT_LINC_DIR, 'token');
    const token = fs.readFileSync(tokenFile);
    return token.toString().trim();
};

/**
 * Save jwt token to file in .linc directory
 * @param jwtToken
 */
const saveJwtToken = (jwtToken) => {
    JwtToken = jwtToken;

    // Create .linc directory if not already there
    dotLinc.ensureDir();

    const tokenFile = path.join(DOT_LINC_DIR, 'token');
    fs.writeFileSync(tokenFile, `${jwtToken}\n`);
};

/**
 * Entry point
 * @param func
 */
module.exports = async (func) => {
    try {
        return func(getJwtToken());
    } catch (e) {
        const token = await authorise();
        saveJwtToken(token);
        return func(token);
    }
};
