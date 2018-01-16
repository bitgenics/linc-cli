const AWSCognito = require('amazon-cognito-identity-js');
const crypto = require('crypto');
const ora = require('ora');
const prompt = require('prompt');
const cred = require('./cred');

const poolData = {
    UserPoolId: 'eu-central-1_fLLmXhVcs',
    ClientId: '17b6280eaiv89vkduqs2bfneid',
};
const userPool = new AWSCognito.CognitoUserPool(poolData);
let cognitoUser;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user to accept terms and conditions
 */
const getTCAcceptance = () => new Promise((resolve, reject) => {
    console.log(`
In order to use LINC, you'll need to accept the Terms and Conditions.
You can find the Terms and Conditions here: https://bitgenics.io/link/legal
`);
    const schema = {
        properties: {
            accept: {
                description: 'Do you accept the Terms and Conditions:',
                default: 'Y',
                required: true,
            },
        },
    };

    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.accept.trim());
    });
});

/**
 * Get confirmation code
 */
const getConfirmationCode = () => new Promise((resolve, reject) => {
    console.log(`
A verification code has been sent to your email address.
    `);
    const schema = {
        properties: {
            code: {
                description: 'Please enter your verification code:',
                pattern: /^[0-9]{6}$/,
                require: true,
            },
        },
    };

    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.code);
    });
});

/**
 * Get user's email
 */
const getUserEmail = () => new Promise((resolve, reject) => {
    console.log(`Thank you for accepting the Terms and Conditions.

Please enter a valid email address. After signing up, you'll receive
an email with a validation link. You'll need to validate your email
address by clicking this link.
`);
    const schema = {
        properties: {
            email: {
                // Fairly good pattern for email addresses
                pattern: /[a-zA-Z0-9%-.+_]+@[a-zA-Z0-9%-.+_]+\.[a-zA-Z]{2,}/,
                description: 'Your email address:',
                message: 'Please enter a valid email address.',
                required: true,
            },
        },
    };

    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.email.trim());
    });
});

/**
 * Create credentials for user
 */
const createCredentials = (email) => {
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.createHash('md5')
        .update(clientId.toString('base64'), 'utf8')
        .digest('hex') + crypto.randomBytes(16).toString('base64');

    return {
        clientId,
        clientSecret,
        email,
    };
};

/**
 * Create new user in Cognito
 * @param email
 */
const cognitoCreateNewUser = (email) => new Promise((resolve, reject) => {
    const attributeList = [];

    const dataEmail = {
        Name: 'email',
        Value: email,
    };
    const attributeEmail = new AWSCognito.CognitoUserAttribute(dataEmail);

    attributeList.push(attributeEmail);

    const credentials = createCredentials(email);
    const { clientId, clientSecret } = credentials;
    userPool.signUp(clientId, clientSecret, attributeList, null, (err, result) => {
        if (err) return reject(err);

        cognitoUser = result.user;
        return resolve(credentials);
    });
});

/**
 * Confirm registration using the verification code
 * @param code
 */
const confirmRegistration = (code) => new Promise((resolve, reject) => {
    if (!cognitoUser) return reject(new Error('User registration failed!'));

    return cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) return reject(err);

        return resolve(result);
    });
});

/**
 * Entry point to sign up new "user"
 */
module.exports.signup = () => new Promise((resolve, reject) => {
    let signupResponse;

    const spinner = ora();
    getTCAcceptance()
        .then(accept => {
            if (accept.substr(0, 1).toLowerCase() !== 'y') {
                throw new Error('You must accept the Terms & Conditions to continue. Abort.');
            }

            return getUserEmail();
        })
        .then(email => {
            spinner.start('Creating new user. Please wait...');

            return cognitoCreateNewUser(email);
        })
        .then(response => {
            spinner.succeed('Successfully created new user.');

            signupResponse = response;
            return getConfirmationCode();
        })
        .then(code => {
            spinner.start('Verifying registration. Please wait...');

            return confirmRegistration(code);
        })
        .then(() => {
            spinner.succeed('Verification succeeded.');

            return cred.save(signupResponse.clientId, signupResponse.clientSecret);
        })
        .then(resolve)
        .catch(err => {
            spinner.stop();

            return reject(err);
        });
});
