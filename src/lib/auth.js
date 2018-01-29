const AWSCognito = require('amazon-cognito-identity-js');

const poolData = {
    UserPoolId: 'eu-central-1_fLLmXhVcs',
    ClientId: '17b6280eaiv89vkduqs2bfneid',
};
const userPool = new AWSCognito.CognitoUserPool(poolData);

let idToken;

/**
 * Authorise using Cognito
 * @param accessKey
 * @param secretKey
 */
const cognitoAuthorise = (accessKey, secretKey) => new Promise((resolve, reject) => {
    const authenticationData = {
        Username: accessKey,
        Password: secretKey,
    };
    const authenticationDetails = new AWSCognito.AuthenticationDetails(authenticationData);
    const userData = {
        Username: accessKey,
        Pool: userPool,
    };
    const cognitoUser = new AWSCognito.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            idToken = result.getIdToken().getJwtToken();
            return resolve(result);
        },
        onFailure: (err) => reject(err),
    });
});

/**
 * Main entry point
 * @param accessKey
 * @param secretKey
 */
// eslint-disable-next-line max-len
module.exports = async (accessKey, secretKey) => {
    const auth = await cognitoAuthorise(accessKey, secretKey);
    return auth.getAccessToken().getJwtToken();
};

/**
 * Get Id Token
 */
module.exports.getIdToken = async () => idToken;
