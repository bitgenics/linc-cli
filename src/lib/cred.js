/* eslint-disable consistent-return,no-bitwise */
const path = require('path');
const fs = require('fs-extra');
const dotLinc = require('./dot-linc');

const { DOT_LINC_DIR } = dotLinc;
const credentialsFile = path.join(DOT_LINC_DIR, 'credentials');
const tokenFile = path.join(DOT_LINC_DIR, 'token');

/**
 * Get credentials
 */
const load = async () => {
    const exists = await fs.exists(credentialsFile);
    if (!exists) throw new Error('No credentials file found.');

    const stat = await fs.stat(credentialsFile);
    if ((stat.mode & 0o777) !== 0o600) {
        console.log(`WARNING: permissions of credentials file ${credentialsFile} may have been tampered with!
Please check your credentials and make sure permissions are set correctly:

$ chmod 0600 ${credentialsFile}
`);
        process.exit(255);
    }

    const credentials = await fs.readJSON(credentialsFile, { throws: false });
    if (!credentials || !credentials.accessKey || !credentials.secretKey) {
        throw new Error('No credentials found in file.');
    }

    return credentials;
};

/**
 * Backup existing credentials
 */
const backup = async () => {
    await fs.rename(credentialsFile, `${credentialsFile}.bak`);
};

/**
 * Remove token from .linc directory
 */
const removeToken = async () => {
    try {
        const exists = await fs.exists(tokenFile);
        if (exists) {
            await fs.unlink(tokenFile);
        }
    } catch (e) {
        // Do nothing
    }
};

/**
 * Save credentials
 * @param accessKey
 * @param secretKey
 */
const save = async (accessKey, secretKey) => {
    const credentials = {
        accessKey,
        secretKey,
    };

    await dotLinc.ensureDir();
    const exists = await fs.exists(credentialsFile);
    if (!exists) {
        await fs.writeJson(credentialsFile, credentials);
        await fs.chmod(credentialsFile, 0o600);
    }

    return credentials;
};

module.exports = {
    backup,
    load,
    removeToken,
    save,
};
