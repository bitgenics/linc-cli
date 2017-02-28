"use strict";
const config = require('../config');
const login = require('../login/');
const crypto = require('crypto');
const aws = require('aws-sdk');
const zip = require('deterministic-zip');
const sha1Sync = require('deterministic-sha1');
const fs = require('fs-promise');

const BUCKET_NAME = 'linc-deployables-dev';

const tmpDir = '/tmp/';

const sha1Dir = (cfg) => {
    return sha1Sync(process.cwd() + '/' + cfg.site.srcdir);
};

const createZipfile = (cfg) => new Promise((resolve, reject) => {
    console.log('Creating zipfile...');

    const localdir = process.cwd() + '/' + cfg.site.srcdir;
    const zipfile = tmpDir + cfg.site.name + '.zip';

    // Check whether the directory actually exists
    fs.stat(localdir, (err, stats) => {
        if (err) return reject(err);

        if (cfg.site.environments !== undefined) {
            const settingsVariable = cfg.settingsVariable || 'settings';

            const settings = {
                SettingsVariableName: settingsVariable,
                Settings: cfg.site.environments
            };
            fs.writeFileSync(localdir + '/lib/settings.json', JSON.stringify(settings, null, 2));
        }

        // Create zipfile from directory
        zip(localdir, zipfile, {cwd: localdir}, err => {
            if (err) return reject(err);
            else return resolve(zipfile);
        })
    });
});

const createKey = (user_id, sha1, cfg) => {
    return `${user_id}/${cfg.site.name}-${sha1}.zip`;
};

const uploadZipfile = (sha1, auth, cfg, zipfile) => new Promise((resolve, reject) => {
    console.log('Uploading zipfile...');

    aws.config = new aws.Config({credentials: auth.aws.credentials});

    const user_id = auth.auth0.profile.user_id;

    const s3 = new aws.S3();
    fs.readFile(zipfile)
        .then(data => {
            return {
                Body: data,
                Bucket: BUCKET_NAME,
                Key: createKey(user_id, sha1.substring(0, 8), cfg)
            }
        })
        .then(params => s3.putObject(params, (err, data) => {
            if (err) return reject(err);
            else return resolve(data);
        }))
        .catch(err => reject(err));
});

const deploy = () => {
    console.log('Starting. Please wait...');

    let sha1 = null;
    let auth = null;
    let configuration = {};

    const p1 = config.load();
    const p2 = login(true);
    Promise.all([p1, p2])
        .then(r => {
            configuration = r[0];   // Configuration parameters
            auth = r[1];            // authentication parameters (auth0, AWS)
        })
        .then(() => config.test(configuration))
        .then(() => sha1Dir(configuration))
        .then(sha1dir => sha1 = sha1dir)
        .then(() => createZipfile(configuration))
        .then(zipfile => uploadZipfile(sha1, auth, configuration, zipfile))
        .then(x => console.log('Your site has been deployed.'))
        .catch(err => console.log(err));
};

module.exports = deploy;
