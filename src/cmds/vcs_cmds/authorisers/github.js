'use strict';
const ora = require('ora');
const prompt = require('prompt');
const oauth = require('../../../lib/oauth');
const openurl = require('opn');

/**
 * Ask whether user is sure
 */
const areYouSure = () => new Promise((resolve, reject) => {
    let schema = {
        properties: {
            ok: {
                description: "You are already authorised. Authorise again?",
                default: 'Y',
                type: 'string'
            }
        }
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result);
    });
});

module.exports.handler = (argv) => {
    const spinner = ora('Authorising. Please wait...').start();

    const siteName = argv.siteName;
    oauth.getAuthoriseUrl(argv, siteName, 'GitHub')
        .then(response => {
            spinner.stop();
            if (!response.already_authorised) return response.authorise_uri;

            return areYouSure()
                .then(result => {
                    if (result.ok.toLowerCase() !== 'y') {
                        console.log('Okay, not reauthorising. Exiting.');
                        return process.exit(0);
                    }

                    return response.authorise_uri;
                })
        })
        .then(uri => {
            console.log(`The following URL will open in your browser shortly:

${uri}

If your browser didn't open this URL, please click on the link or copy the link into your browser's address bar. (On Linux, you need to press the Ctrl key and click on the link.)

Please note that this URL will be valid for approx. 30 minutes, after which you need to re-run this command.
`);
            openurl(uri);
        })
        .catch(err => {
            spinner.stop();
            console.log(`Oops, something went wrong:\n${err}.`);
        });
};
