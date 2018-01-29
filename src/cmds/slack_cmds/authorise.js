/* eslint-disable max-len */
const ora = require('ora');
const prompt = require('prompt');
const notice = require('../../lib/notice');
const oauth = require('../../lib/oauth');
const openurl = require('opn');
const assertPkg = require('../../lib/package-json').assert;

const spinner = ora();

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

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

/**
 * Authorise Slack
 */
const authorise = async (siteName) => {
    spinner.start('Please wait...');
    const response = await oauth.getAuthoriseUrl(siteName, 'Slack');
    spinner.stop();

    if (response.already_authorised) {
        const result = await areYouSure();
        if (result.ok.toLowerCase() !== 'y') {
            spinner.fail('Okay, not reauthorising. Exiting.');
            return process.exit(0);
        }
    }

    const uri = response.authorise_uri;
    console.log(`
The following URL will open in your browser shortly:

${uri}

If your browser didn't open this URL, please click on the link or copy the link into your browser's address bar. (On Linux, you need to press the Ctrl key and click on the link.)
`);

    return openurl(uri);
};

exports.command = 'authorise';
exports.desc = 'Authorise LINC and install LINC app in your Slack';
exports.handler = (argv) => {
    const { siteName } = argv;
    if (!siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    authorise(siteName)
        .catch(err => {
            spinner.stop();

            console.log(err);
        });
};
