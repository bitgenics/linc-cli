/* eslint-disable global-require,import/no-dynamic-require */
const fs = require('fs-extra');
const path = require('path');
const installProfilePackage = require('../lib/install-profile-pkg');
const assertPkg = require('../lib/package-json').assert;
const notice = require('../lib/notice');
const packageOptions = require('../lib/pkgOptions');
const serve = require('../lib/serve');

/**
 * Clean dist directory
 */
const clean = () => {
    const distDir = path.join(process.cwd(), 'dist');

    fs.emptyDirSync(distDir);
    fs.rmdirSync(distDir);
};

/**
 * Build site
 */
const build = (argv) => {
    const buildssr = require('linc-build-ssr');
    const packageJson = require(path.resolve(process.cwd(), 'package.json'));

    buildssr({}, packageJson, (err) => {
        if (err) console.log(err);
        else if (!argv.s) serve();
    });
};

exports.command = 'build';
exports.desc = 'Build & package a site for deployment';
exports.handler = (argv) => {
    assertPkg();

    notice();

    clean();
    packageOptions(['buildProfile'])
        .then(pkg => installProfilePackage(pkg.linc.buildProfile))
        .then(() => {
            console.log('Building. Please wait...');
            return build(argv);
        })
        .catch(err => console.log(err.message ? err.message : err));
};
