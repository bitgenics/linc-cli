'use strict';
const path = require('path');
const crypto = require('crypto');
const aws = require('aws-sdk');
const zip = require('deterministic-zip');
const sha1Sync = require('deterministic-sha1');
const fs = require('fs-promise');
const auth = require('../auth');

const BUCKET_NAME = 'linc-deployables-dev';

const tmpDir = '/tmp/';

const sha1 = (s) => {
    return crypto.createHash('sha1').update(s).digest('hex');
};

const calculateSettingsId = (settings) => {
    return sha1(JSON.stringify(settings.replace(/(\r\n|\n|\r)/gm,"")));
};

const calculateDeployKey = (code_id, settings_id) => {
    return sha1(`${code_id}.${settings_id}`).substr(0, 12);
};

const sha1Dir = (source_dir) => {
    return sha1Sync(path.join(process.cwd(), source_dir));
};

const createZipfile = (temp_dir, source_dir, site_name, opts) => new Promise((resolve, reject) => {
    const options = opts || {cwd: process.cwd()};
    const cwd = options.cwd;
    const localdir = path.join(cwd, source_dir);
    const zipfile = path.join(temp_dir, site_name + '.zip');

    // Check whether the directory actually exists
    fs.stat(options.cwd, (err, stats) => {
        if (err) return reject(err);

        // Create zipfile from directory
        zip(localdir, zipfile, options, err => {
            if (err) return reject(err);
            else return resolve(zipfile);
        })
    });
});

const createKey = (user_id, sha1, site_name) => {
    return `${user_id}/${site_name}-${sha1}.zip`;
};

const uploadZipfile = (sha1, auth, site_name, zipfile) => new Promise((resolve, reject) => {
    aws.config = new aws.Config({credentials: auth.aws.credentials});
    const s3 = new aws.S3();

    fs.readFile(zipfile)
        .then(data => {
            const user_id = auth.auth0.profile.user_id;
            return {
                Body: data,
                Bucket: BUCKET_NAME,
                Key: createKey(user_id, sha1.substring(0, 8), site_name)
            }
        })
        .then(params => s3.putObject(params, (err, data) => {
            if (err) return reject(err);
            else return resolve(data);
        }))
        .catch(err => reject(err));
});

const getSiteSettings = () => new Promise((resolve, reject) => {
    const settingsFile = path.join(process.cwd(), 'site-settings.json');
    fs.stat(settingsFile, (err, stats) => {
        if (err) {
            return (err.code === 'ENOENT') ? resolve({}) : reject(err);
        }

        fs.readFile(settingsFile)
            .then(x => resolve(x.toString()))
            .catch(err => reject(err))
    });
});

const saveSettings = (temp_dir, filename, settings) => new Promise((resolve, reject) => {
    fs.writeJson(path.join(temp_dir, filename), settings, err => {
        if (err) return reject(err);
        else return resolve();
    });
});

const createTempDir = () => new Promise((resolve, reject) => {
    fs.mkdtemp(`${tmpDir}linc-`, (err, folder) => {
        if (err) return reject(err);
        else return resolve(folder);
    });
});

const deploy = (argv) => {
    console.log('Starting. Please wait...');

    const site_name = argv.site.name;
    const source_dir = 'dist';
    const code_id = sha1Dir(source_dir);
    let settings_id = null;
    let deploy_key = null;

    let authParams = null;
    let tempDir = null;
    auth(argv.accessKey, argv.secretKey)
        .then(auth_params => {
            authParams = auth_params;
            return createTempDir()
        })
        .then(temp_dir => {
            tempDir = temp_dir;
            return createZipfile(temp_dir, source_dir, site_name)
        })
        .then(() => getSiteSettings())
        .then(settings => {
            settings_id = calculateSettingsId(settings);
            deploy_key = calculateDeployKey(code_id, settings_id);
            saveSettings(tempDir, 'settings.json', settings);
        })
        .then(() => saveSettings(tempDir, 'deployment.json', {deploy_key: deploy_key}))
        .then(() => createZipfile(tmpDir, '/', site_name, {cwd: tempDir}))
        .then(zipfile => uploadZipfile(code_id, authParams, site_name, zipfile))
        .then(() => console.log(`
Your site has been deployed. The latest version has a deployment key of ${deploy_key},
and it can be reached at this URL: https://${deploy_key}.bitgenictest.com.
Please note that it may take a few moments to become available.
        `))
        .catch(err => console.log(err));
};

exports.command = 'deploy';
exports.desc = 'Deploy a web site by uploading it to LINC';
exports.handler = (argv) => {
    deploy(argv);
};
