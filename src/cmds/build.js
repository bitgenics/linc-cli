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
 *
 * @param pkg
 */
const buildDistribution = (pkg) => new Promise((resolve, reject) => {
    const buildssr = require('linc-build-ssr');

    return buildssr({}, pkg, (err) => {
        if (err) return reject(err);

        return resolve();
    })
});

/**
 * Build site
 */
const build = async () => {
    try {
        /**
         * Check for or add build profile and install if needed
         */
        const pkg = await packageOptions(['buildProfile']);
        await installProfilePackage(pkg.linc.buildProfile);

        /**
         * Build distribution
         */
        await buildDistribution(pkg);

        /**
         * Serve if build has succeeded
         */
        serve();
    } catch (e) {
        console.log(e);
    }
};

exports.command = 'build';
exports.desc = 'Build & package a site for deployment';
exports.handler = () => {
    assertPkg();

    notice();

    clean();

    build()
        .then(() => {});
};
