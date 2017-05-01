'use strict';
const fs = require('fs-extra');
const assertPkg = require('../lib/package-json').assert;
const notice = require('../lib/notice');

const clean = (argv) => {
    const distDir = process.cwd() + '/dist';

    fs.emptyDirSync(distDir);
    fs.rmdirSync(distDir);
    console.log('Done.');
};

exports.command = 'clean';
exports.desc = 'Clean project directory (removes \'dist\').';
exports.handler = (argv) => {
    assertPkg();

    notice();

    clean(argv);
};
