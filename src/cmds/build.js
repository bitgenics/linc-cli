'use strict';
const notice = require('../lib/notice');

const build = () => {
    const path = require('path');
    const buildssr = require('@bitgenics/linc-build-ssr');
    const packageJson = require(path.resolve(process.cwd(), 'package.json'));

    buildssr({}, packageJson, (err, results) => {
    	if (err) console.log(err);

        console.log(`Done! The new build can be found in the folder 'dist'.
You can also try your new version locally by running 'linc serve'.
`);
    });
};

exports.command = 'build';
exports.desc = 'Build & package a site for deployment';
exports.handler = (argv) => {
    notice();

    console.log('Building. Please wait...');
	build();
};
