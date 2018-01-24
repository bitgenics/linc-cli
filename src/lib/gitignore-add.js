const _ = require('underscore');
const fs = require('fs');
const path = require('path');

const GITIGNORE = '.gitignore';

/**
 * Add a rule to .gitignore
 * @param rule
 * @param options
 * @returns {number} Return 0 if successful, or -1 if an error occured
 */
module.exports = (rule, options) => {
    let result = 0;
    const cwd = options.cwd || process.cwd();
    const create = options.create || false;

    const ignorePath = path.join(cwd, GITIGNORE);
    try {
        const ignore = fs.readFileSync(ignorePath).toString();
        const lines = _.filter(ignore.split('\n'), x => x.length > 0);
        if (lines.indexOf(rule.trim()) === 0) {
            lines.push(rule.trim());
            fs.writeFileSync(ignorePath, `${lines.join('\n')}\n`);
        }
    } catch (e) {
        // File not found: do we create a new file?
        if (create && e.code === 'ENOENT') {
            // Why yes!
            try {
                fs.writeFileSync(ignorePath, `${rule.trim()}\n`);
            } catch (e) {
                result = -1;
            }
        }
    }
    return result;
};
