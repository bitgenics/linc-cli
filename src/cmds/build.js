/* eslint-disable global-require,import/no-dynamic-require */
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');
const installProfilePackage = require('../lib/install-profile-pkg');
const assertPkg = require('../lib/package-json').assert;
const notice = require('../lib/notice');
const packageOptions = require('../lib/pkgOptions');
const serve = require('../lib/serve');

const spinner = ora();

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
    });
});

/**
 * Build site
 * @param argv
 */
const build = async (argv) => {
    /**
     * Check for or add build profile and install if needed
     */
    const pkg = await packageOptions(['buildProfile']);

    spinner.start('Installing profile package. Please wait...');
    await installProfilePackage(pkg.linc.buildProfile);
    spinner.succeed('Installed profile package.');

    /**
     * Build distribution
     */
    await buildDistribution(pkg);

    /**
     * Serve if build has succeeded
     */
    if (!argv.s) serve();
};

exports.command = 'build';
exports.desc = 'Build & package a site for deployment';
exports.handler = (argv) => {
    assertPkg();

    notice();

    clean();

    build(argv)
        .catch(err => {
            console.log(err);
        });
};
