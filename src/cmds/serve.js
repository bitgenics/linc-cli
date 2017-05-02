'use strict';
const path = require('path');
const fs = require('fs');
const notice = require('../lib/notice');
const assertPkg = require('../lib/package-json').assert;

const getOptions = () => {
    const settingsFile = path.join(process.cwd(), 'site-settings.json');
    try {
        const settings = fs.readFileSync(settingsFile, {encoding: 'utf-8'});
        const jsonObj = JSON.parse(settings);
        return {settingsVariable: jsonObj.SettingsVariableName, settings: jsonObj.Settings};
    } catch (e) {
        return {};
    }
};

const serve = (argv) => {
    const express = require('express');
    const ssr = require('linc-simple-express');
    const compression = require('compression');

    const app = express();

    const libDir = path.resolve(process.cwd(), 'dist', 'lib/');
    const options = getOptions();
    app.use(compression());
    app.use('/_assets', express.static(path.resolve(process.cwd(), 'dist', 'static', '_assets')));
    app.use('/', ssr(libDir, options));

    app.listen(3000, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Listing on http://localhost:3000');
        }
    });
};

exports.command = 'serve';
exports.desc = 'Run a Linc server locally';
exports.handler = (argv) => {
    assertPkg();

    notice();

    serve(argv);
};
