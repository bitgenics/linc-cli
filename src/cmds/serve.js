'use strict';
const path = require('path');
const fs = require('fs');

const getOptions = () => {
    const settingsFile = path.join(process.cwd(), 'site-settings.json');
    const settings = fs.readFileSync(settingsFile, {encoding: 'utf-8'});
    const jsonObj = JSON.parse(settings);
    return {settingsVariable: jsonObj.SettingsVariableName, settings: jsonObj.Settings};
};

const serve = (argv) => {
    const express = require('express');
    const ssr = require('@bitgenics/linc-simple-express');

    const app = express();

    const libDir = path.resolve(process.cwd(), 'dist/lib/');
    const options = getOptions();
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
};
