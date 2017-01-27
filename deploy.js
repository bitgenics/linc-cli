"use strict";
const config = require('./config');
const login = require('./login');
const crypto = require('crypto');
const s3 = require('s3');
const zip = require('deterministic-zip');

const BUCKET_NAME = 'hugo-fresh-deployables';

const tmpDir = '/tmp';

const createFilename = (config) => {
    const dummySHA = crypto.randomBytes(4).toString('hex').substring(0, 7);
    return `${config.name}-${dummySHA}.zip`;
};

const createZipfile = (config, filename) => new Promise((resolve, reject) => {
    const localdir = './' + config.srcdir;
    const outfile = tmpDir + '/' + filename;

    zip(localdir, outfile, {cwd: localdir}, err => {
        if (err) return reject(err);
        else return resolve(outfile);
    })
});

const uploadZipfile = (auth, config, zipfile) => new Promise((resolve, reject) => {
    let s3Client = s3.createClient({
        's3Options': {
            credentials: auth.aws.credentials
        }
    });

    const key = config.property.arg + '/' + zipfile.substring(0, zipfile.length - 4);   // strip the .zip
    const params = {
        'localFile': zipfile,
        's3Params': {
            Bucket: BUCKET_NAME,
            Key: key
        }
    };

    let uploader = s3Client.uploadFile(params);
    uploader.on('error', err => reject(err));
    uploader.on('progress', () => console.log('progress', uploader.progressMd5Amount, uploader.progressAmount, uploader.progressTotal));
    uploader.on('end', () => resolve());
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
        .then(() => createFilename(configuration.property))
        .then((filename) => createZipfile(configuration.property, filename))
        .then((zipfile) => uploadZipfile(auth, configuration, zipfile))
        .then((x) => console.log('Your property has been deployed: ' + JSON.stringify(x)))
        .catch(err => console.log(err));
};

module.exports = deploy;
