const ora = require('ora');
const domains = require('../../lib/domains');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

const spinner = ora();

/**
 * List the available domains for this site
 * @param siteName
 */
const list = async (siteName) => {
    spinner.start('Retrieving available domains...');
    const availableDomains = await domains.getAvailableDomains(siteName);
    spinner.stop();

    await domains.showAvailableDomains(availableDomains);
};

/**
 * Error message
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
};

exports.command = 'list';
exports.desc = 'List available domain names';
exports.handler = (argv) => {
    const { siteName } = argv;
    if (!siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    list(siteName)
        .then(() => {})
        .catch(err => {
            spinner.stop();

            error(err);
        });
};
