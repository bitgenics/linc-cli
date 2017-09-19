'use strict';
const fs = require('fs-extra');
const assertPkg = require('../lib/package-json').assert;
const notice = require('../lib/notice');

const clean = (argv) => {
    const distDir = process.cwd() + '/dist';

    fs.emptyDirSync(distDir);
    fs.rmdirSync(distDir);
};


const build = () => {
    const path = require('path');
    const buildssr = require('linc-build-ssr');
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
    assertPkg();

    notice();

    console.log('Building. Please wait...');
    clean();
	build();
};
