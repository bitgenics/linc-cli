const ora = require('ora');
const assertPkg = require('../lib/package-json').assert;
const domains = require('../lib/domains');
const notice = require('../lib/notice');
const releases = require('../lib/releases');

const spinner = ora();

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
const show = async (argv) => {
    const { siteName } = argv;

    if (!siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    console.log(`The current site is: '${siteName}'\n`);

    spinner.start('Retrieving data. Please wait...');
    const availableDomains = await domains.getAvailableDomains(siteName);
    const availableReleases = await releases.getAvailableReleases(siteName);
    spinner.stop();

    domains.showAvailableDomains(availableDomains);
    releases.showAvailableReleases(availableReleases);
};

exports.command = 'show';
exports.desc = 'Show information about your site';
exports.handler = (argv) => {
    assertPkg();

    notice();

    show(argv)
        .then(() => {})
        .catch(err => {
            spinner.stop();
            error(err);
        });
};
