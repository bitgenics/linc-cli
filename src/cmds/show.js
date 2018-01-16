const ora = require('ora');
const assertPkg = require('../lib/package-json').assert;
const domains = require('../lib/domains');
const notice = require('../lib/notice');
const releases = require('../lib/releases');

/**
 * Show error
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err.message);
};

/**
 * Show site information
 * @param argv
 */
const show = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    console.log(`The current site is: '${argv.siteName}'\n`);

    const siteName = argv.siteName;
    const spinner = ora();

    spinner.start('Retrieving data. Please wait...');
    return Promise.all([
        domains.getAvailableDomains(siteName),
        releases.getAvailableReleases(siteName),
    ])
        .then(result => {
            spinner.stop();
            domains.showAvailableDomains(result[0]);
            releases.showAvailableReleases(result[1]);
        })
        .catch(err => {
            spinner.stop();

            error(err);
        });
};

exports.command = 'show';
exports.desc = 'Show information about your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    show(argv);
};
