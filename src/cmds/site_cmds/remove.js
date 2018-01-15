const ora = require('ora');
const prompt = require('prompt');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;
const sites = require('../../lib/sites');

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
            site_name: {
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
    console.log(`\nOops! Something went wrong: ${err.message}`);
};

/**
 * Remove site
 * @param argv
 */
const remove = (argv) => {
    let siteName = null;

    assertPkg();

    notice();

    const spinner = ora();

    console.log(`Removing a site is a destructive operation that CANNOT be undone. 
The operation will remove all resources associated with your site, 
and it will no longer be accessible/available to you.
`);

    getSiteName('Name of site to remove:')
        .then(x => {
            siteName = x.site_name;
            return getSiteName('Please type the name of the site again:')
                .then(y => {
                    if (siteName !== y.site_name) throw new Error('Error: the names don\'t match.');

                    console.log('Please wait...');
                });
        })
        .then(() => {
            spinner.start('Deleting site. Please wait...');
            return sites.deleteSite(argv, siteName);
        })
        .then(() => {
            spinner.succeed('Site deleted. It can no longer be accessed.');
        })
        .catch(err => {
            spinner.stop();
            return error(err);
        });
};

exports.command = 'remove';
exports.desc = 'Remove your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    remove(argv);
};
