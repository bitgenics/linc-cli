const fs = require('fs-extra');
const path = require('path');

const DOT_LINC_DIR = path.join(process.cwd(), '.linc');

module.exports.DOT_LINC_DIR = DOT_LINC_DIR;

module.exports.ensureDir = () => fs.ensureDir(DOT_LINC_DIR);
