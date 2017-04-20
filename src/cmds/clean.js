'use strict';
const fs = require('fs-extra');

const clean = (argv) => {
    const distDir = process.cwd() + '/dist';

    fs.emptyDirSync(distDir);
    fs.rmdirSync(distDir);
    console.log('Done.');
};

exports.command = 'clean';
exports.desc = 'Clean project directory';
exports.handler = (argv) => {
    clean(argv);
};
