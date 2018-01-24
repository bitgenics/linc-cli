const prompt = require('prompt');
const notice = require('../../lib/notice');
const assertPkg = require('../../lib/package-json').assert;
const hookBitbucket = require('./hooks/bitbucket').handler;
const hookGithub = require('./hooks/github').handler;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

exports.command = 'hook <name> [command]';
exports.desc = 'Handle webhook for your VCS';
// eslint-disable-next-line consistent-return
exports.handler = (argv) => {
    const { siteName } = argv;
    if (!siteName) {
        console.log('This project is not initialised. Did you forget to \'linc init\'?');
        process.exit(255);
    }

    assertPkg();

    notice();

    const { name } = argv;
    if (name === 'bitbucket') return hookBitbucket(argv);
    if (name === 'github') return hookGithub(argv);

    console.log(`Sorry, I don't recognise the VCS system '${name}'.
Supported VCS systems are: 'bitbucket' and 'github'.
Exiting.`);
};
