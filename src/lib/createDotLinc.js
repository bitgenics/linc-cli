const fs = require('fs-extra');
const path = require('path');

/**
 * Create .linc directory
 */
module.exports = () => {
    const dotLinc = path.resolve(process.cwd(), '.linc');
    if (!fs.existsSync(dotLinc)) {
        fs.mkdirSync(dotLinc);
    }
};
