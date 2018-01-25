const ora = require('ora');
const prompt = require('prompt');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;
const sites = require('../../lib/sites');

const spinner = ora();

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Ask user for site name
 * @param message
 */
const getSiteName = (message) => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            siteName: {
                // Only a-z, 0-9 and - are allowed. Cannot start/end with -.
                pattern: /^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/,
                description: message,
                message: 'Only a-z, 0-9 and - are allowed. Cannot start/end with -.',
                required: true,
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
 * Show error message
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
};

/**
 * Remove site
 */
const remove = async () => {
    console.log(`Removing a site is a destructive operation that CANNOT be undone. 
The operation will remove all resources associated with your site, 
and it will no longer be accessible/available to you.
`);

    const { siteName } = await getSiteName('Name of site to remove:');
    const rptSiteName = await getSiteName('Please type the name of the site again:');
    if (siteName !== rptSiteName.siteName) {
        throw new Error('Error: the names don\'t match.');
    }

    spinner.start('Deleting site. Please wait...');
    await sites.deleteSite(siteName);
    spinner.succeed('Site deleted. It can no longer be accessed.');
};

exports.command = 'remove';
exports.desc = 'Remove your site';
exports.handler = () => {
    assertPkg();

    notice();

    remove()
        .catch(err => {
            spinner.stop();

            error(err);
        });
};
