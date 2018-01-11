'use strict';
const _ = require('underscore');
const fs = require('fs-extra');
const assertPkg = require('../lib/package-json').assert;
const notice = require('../lib/notice');
const packageOptions = require('../lib/pkgOptions');
const serve = require('../lib/serve');

const clean = (argv) => {
    const distDir = process.cwd() + '/dist';

    fs.emptyDirSync(distDir);
    fs.rmdirSync(distDir);
};

/**
 * Build site
 */
const build = () => {
    const path = require('path');
    const buildssr = require('linc-build-ssr');
    const packageJson = require(path.resolve(process.cwd(), 'package.json'));

    buildssr({}, packageJson, (err, results) => {
    	if (err) console.log(err);
        else serve();
    });
};

exports.command = 'build';
exports.desc = 'Build & package a site for deployment';
exports.handler = (argv) => {
    assertPkg();

    notice();

    clean();
    packageOptions(['buildProfile'])
        .then(() => {
            console.log('Building. Please wait...');
            return build();
        })
        .catch(err => console.log(err.message ? err.message : err));
};
