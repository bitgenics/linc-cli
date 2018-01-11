'use strict';
const serve = require('../lib/serve');

exports.command = 'serve';
exports.desc = 'Start local web server';
exports.handler = (argv) => {
    assertPkg();

    serve();
};
