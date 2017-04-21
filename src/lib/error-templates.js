'use strict';
const fs = require('fs');

const errorDir = 'errors';

const htmlErrors = {
    "400": "Bad Request",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Now Allowed",
    "414": "URI Too Long",
    "416": "Range Not Satisfiable",
    "500": "Internal Server Error",
    "501": "Not Implemented",
    "502": "Bad Gateway",
    "503": "Service Unavailable",
    "504": "Gateway Time-out"
};

const errorTemplate = (code) =>
`<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html>
  <head>
    <title>${code} ${htmlErrors[code]}</title>
  </head>
  <body>
    <h1>${htmlErrors[code]}</h1>
  </body>
</html>
`;

const writeTemplate = (path, key) => new Promise((resolve, reject) => {
    return fs.writeFile(`${path}/${key}.html`, errorTemplate(key), { encoding: 'utf-8' }, err => {
        if (err) return reject(err);
        else return resolve();
    });
});

const createFiles = (path) => {
    const errorPath = `${path}/${errorDir}`;
    if (fs.existsSync(errorPath)) {
        console.log(`Custom error pages directory '${errorDir}' already exists. No templates have been copied.`);
        return Promise.resolve();
    }

    fs.mkdirSync(errorPath);
    let promises = [];
    for (let k in htmlErrors) {
        promises.push(writeTemplate(errorPath, k));
    }
    return Promise.all(promises);
};

module.exports = createFiles;
