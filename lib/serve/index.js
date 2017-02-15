'use strict'

const serve = () => {
    const path = require('path');
    const fs = require('fs');
    const express = require('express');
    const ssr = require('linc-simple-express');
    const toml = require('toml');

    const app = express();
    const tomlStr = fs.readFileSync('linc.toml', 'utf-8');
    const config = toml.parse(tomlStr);

    const libDir = path.resolve(process.cwd(), 'dist/lib/');
    const options = {settingsVariable: config.settingsVariable, settings: config.environments.prod};
    app.use('/_assets', express.static(path.resolve(process.cwd(), 'dist/_assets')));
    app.use('/', ssr(libDir, options));
    

    app.listen(3000, (err) => {
        if(err) {
            console.log(err);
        } else {
            console.log('Listing on port: 3000');
        }
    });
}

module.exports = serve;