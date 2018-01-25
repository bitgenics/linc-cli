const ora = require('ora');
const prompt = require('prompt');
const assertPkg = require('../../lib/package-json').assert;
const notice = require('../../lib/notice');
const sites = require('../../lib/sites');

const spinner = ora();

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
const invalidate = async (argv) => {
    const { siteName } = argv;
    if (!siteName) {
        console.log('This project does not have a site name. Please create a site first.');
        process.exit(255);
    }

    let { pattern } = argv;
    if (!pattern) {
        pattern = '/*';
    }

    spinner.start('Invalidating cache...');
    await sites.invalidateCache(siteName, pattern);
    spinner.succeed('Cache invalidated.');
};

exports.command = 'invalidate [pattern]';
exports.desc = 'Invalidate cache using optional pattern string';
exports.handler = (argv) => {
    assertPkg();

    notice();

    invalidate(argv)
        .then(() => {})
        .catch(err => {
            spinner.stop();

            error(err);
        });
};
