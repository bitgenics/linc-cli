'use strict';
const path = require('path');
const fs = require('fs');

const serve = (argv) => {
    const express = require('express');
    const ssr = require('@bitgenics/linc-simple-express');

    const app = express();

    const libDir = path.resolve(process.cwd(), 'dist/lib/');
    const options = {settingsVariable: argv.settingsVariable, settings: argv.site.environments.prod};
    app.use('/_assets', express.static(path.resolve(process.cwd(), 'dist/_assets')));
    app.use('/', ssr(libDir, options));

    app.listen(3000, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Listing on port: 3000');
        }
    });
};

exports.command = 'serve';
exports.desc = 'Run a Linc server locally';
exports.handler = (argv) => {
    serve(argv);
}
