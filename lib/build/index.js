'use strict'

const build = () => {
    const path = require('path');
    const buildssr = require('linc-build-ssr');
    const packageJson = require(path.resolve(process.cwd(), 'package.json'));
    buildssr({}, packageJson, (err, results) => {
    	console.log(err);
    	console.log(results);
    });
}

module.exports = build;