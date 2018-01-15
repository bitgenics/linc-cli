const assertPkg = require('../lib/package-json').assert;
const serve = require('../lib/serve');

exports.command = 'serve';
exports.desc = 'Start local web server';
exports.handler = () => {
    assertPkg();

    serve();
};
