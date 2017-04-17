'use strict';

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

const errorTemplate = (code) => {
    return `
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html>
<head>
  <title>${code} ${htmlErrors[code]}</title>
</head>
<body>
  <h1>${htmlErrors[code]}</h1>
</body>
</html>
`;
};

const writeTemplate = (path, key) => {
    console.log(errorTemplate(key));
};

module.exports = (path) => {
    for (let k in htmlErrors) {
        writeTemplate(path, k);
    }
};
