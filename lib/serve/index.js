'use strict'

const serve = () => {
    const path = require('path');
    const express = require('express');
    const ssr = require('linc-simple-express');

    const app = express();

    app.use('/_assets', express.static(path.resolve(process.cwd(), 'dist/_assets')));
    app.use('/', ssr(path.resolve(process.cwd(), 'dist/lib/')));

    app.listen(3000, (err) => {
        if(err) {
            console.log(err);
        } else {
            console.log('Listing on port: 3000');
        }
    });
}

module.exports = serve;