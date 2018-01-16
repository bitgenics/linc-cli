const ora = require('ora');
const domains = require('../../lib/domains');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;

/**
 * List the available domains for this site
 * @param argv
 */
const list = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    assertPkg();

    notice();

    const siteName = argv.siteName;
    const spinner = ora('Retrieving available domains...').start();

    domains.getAvailableDomains(siteName)
        .then(result => {
            spinner.stop();

            return domains.showAvailableDomains(result);
        })
        .catch(err => {
            spinner.stop();

            console.log(`Oops, something went wrong:\n${err}.`);
        });
};

exports.command = 'list';
exports.desc = 'List available domain names';
exports.handler = (argv) => {
    list(argv);
};
