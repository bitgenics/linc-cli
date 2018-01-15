const ora = require('ora');
const prompt = require('prompt');
const assertPkg = require('../../lib/package-json').assert;
const notice = require('../../lib/notice');
const sites = require('../../lib/sites');

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Show error
 * @param err
 */
const error = (err) => {
    console.log('Oops! Something went wrong:');
    console.log(err);
};

/**
 * Handle invalidate command
 * @param argv
 */
const invalidate = (argv) => {
    if (!argv.siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    const siteName = argv.siteName;

    let pattern = '/*';
    if (argv.pattern) {
        pattern = argv.pattern;
    }

    const spinner = ora('Invalidating cache...').start();
    sites.invalidateCache(argv, siteName, pattern)
        .then(() => {
            spinner.succeed('Cache invalidated.');
        })
        .catch(err => {
            spinner.stop();
            return error(err);
        });
};

exports.command = 'invalidate [pattern]';
exports.desc = 'Invalidate cache using optional pattern string';
exports.handler = (argv) => {
    assertPkg();

    notice();

    invalidate(argv);
};
