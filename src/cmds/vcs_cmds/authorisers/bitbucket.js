/* eslint-disable max-len */
const ora = require('ora');
const prompt = require('prompt');
const oauth = require('../../../lib/oauth');
const openurl = require('opn');

const spinner = ora();

/**
 * Ask whether user is sure
 */
const areYouSure = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            ok: {
                description: 'You are already authorised. Authorise again?',
                default: 'Y',
                type: 'string',
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result);
    });
});

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Authorise
 * @param siteName
 */
const authorise = async (siteName) => {
    spinner.start('Authorising. Please wait...');
    const response = await oauth.getAuthoriseUrl(siteName, 'Bitbucket');
    spinner.stop();

    if (!response.already_authorised) return response.authorise_uri;

    const result = await areYouSure();
    if (result.ok.toLocaleString() !== 'y') {
        console.log('Okay, not reauthorising. Exiting.');
        process.exit(0);
    }

    const uri = response.authorise_uri;
    console.log(`The following URL will open in your browser shortly:

${uri}

If your browser didn't open this URL, please click on the link or copy the link into your browser's address bar. (On Linux, you need to press the Ctrl key and click on the link.)

Please note that this URL will be valid for approx. 30 minutes, after which you need to re-run this command.
`);

    return openurl(uri);
};

module.exports.handler = (argv) => {
    spinner.start('Authorising. Please wait...');

    const { siteName } = argv;
    authorise(siteName)
        .catch(err => {
            spinner.stop();
            console.log(`Oops, something went wrong:\n${err}.`);
        });
};
