"use strict";
const config = require('../config');
const login = require('../login/');
const crypto = require('crypto');
const aws = require('aws-sdk');
const zip = require('deterministic-zip');
const sha1file = require('sha1-file');
const fs = require('fs-promise');

const BUCKET_NAME = 'hugo-fresh-deployables';

const tmpDir = '/tmp/';

const createZipfile = (cfg) => new Promise((resolve, reject) => {
    console.log('Creating zipfile...');

    const localdir = process.cwd() + '/' + cfg.site.srcdir;
    const zipfile = tmpDir + cfg.site.name + '.zip';

    // Check whether the directory actually exists
    fs.stat(localdir, (err, stats) => {
        if (err) return reject(err);

        // Create zipfile from directory
        zip(localdir, zipfile, {cwd: localdir}, err => {
            if (err) return reject(err);
            else return resolve(zipfile);
        })
    });
});

const createKey = (user_id, sha1, cfg) => {
    return `${user_id}/${cfg.site.org}/${cfg.site.name}-${sha1}.zip`;
};

const uploadZipfile = (auth, cfg, zipfile) => new Promise((resolve, reject) => {
    console.log('Uploading zipfile...');

    aws.config = new aws.Config({credentials: auth.aws.credentials});

    const user_id = auth.auth0.profile.user_id;

    const s3 = new aws.S3();
    fs.readFile(zipfile)
        .then(data => {
            return {
                Body: data,
                Bucket: BUCKET_NAME,
                Key: createKey(user_id, sha1file(zipfile).substring(0, 7), cfg)
            }
        })
        .then(params => s3.putObject(params, (err, data) => {
            if (err) return reject(err);
            else return resolve(data);
        }))
        .catch(err => reject(err));
});

/**
 * Perform some simple checks on the configuration as read from the config.linc file.
 * @param cfg
 */
const checkConfiguration = (cfg) => new Promise((resolve, reject) => {
    if (!cfg.site) return reject('Configuration must contain a site');

    const site = cfg.site;
    if (!(site.org && site.name && site.srcdir)) return reject('Site has invalid parameters');

    return resolve();
});

const deploy = () => {
    console.log('Starting. Please wait...');

    let auth = null;
    let configuration = {};

    const p1 = config.load();
    const p2 = login(true);
    Promise.all([p1, p2])
        .then(r => {
            configuration = r[0];   // Configuration parameters
            auth = r[1];            // authentication parameters (auth0, AWS)
        })
        .then(() => checkConfiguration(configuration))
        .then(() => createZipfile(configuration))
        .then(zipfile => uploadZipfile(auth, configuration, zipfile))
        .then(x => console.log('Your site has been deployed.'))
        .catch(err => console.log(err));
};

module.exports = deploy;
