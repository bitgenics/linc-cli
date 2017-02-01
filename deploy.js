"use strict";
const config = require('./config');
const login = require('./login');
const crypto = require('crypto');
const aws = require('aws-sdk');
const zip = require('deterministic-zip');
const sha1file = require('sha1-file');
const fs = require('fs-promise');

const BUCKET_NAME = 'hugo-fresh-deployables';

const tmpDir = '/tmp/';

const createZipfile = (cfg) => new Promise((resolve, reject) => {
    const localdir = './' + cfg.property.srcdir;
    const zipfile = tmpDir + cfg.property.name + '.zip';

    zip(localdir, zipfile, {cwd: localdir}, err => {
        if (err) return reject(err);
        else return resolve(zipfile);
    })
});

const createKey = (sha1, cfg) => {
    return `${cfg.property.org}/${cfg.property.name}-${sha1}.zip`;
};

const uploadZipfile = (auth, cfg, zipfile) => new Promise((resolve, reject) => {
    aws.config = new aws.Config({credentials: auth.aws.credentials});

    const s3 = new aws.S3();
    fs.readFile(zipfile)
        .then(data => {
            return {
                Body: data,
                Bucket: BUCKET_NAME,
                Key: createKey(sha1file(zipfile).substring(0, 7), cfg)
            }
        })
        .then(params => s3.putObject(params, (err, data) => {
            if (err) return reject(err);
            else return resolve(data);
        }))
        .catch(err => reject(err));
});

const deploy = () => {
    let auth = null;
    let configuration = {};

    const p1 = config.load();
    const p2 = login(true);
    Promise.all([p1, p2])
        .then(r => {
            configuration = r[0];   // Configuration parameters
            auth = r[1];            // authentication parameters (auth0, AWS)
        })
        .then((filename) => createZipfile(configuration, filename))
        .then((zipfile) => uploadZipfile(auth, configuration, zipfile))
        .then((x) => console.log('Your property has been deployed.'))
        .catch(err => console.log(err));
};

module.exports = deploy;
