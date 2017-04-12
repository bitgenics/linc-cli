'use strict';

/**
 *
 * @param argv
 *
 * Check existence of package.json (mandatory)
 * Ask user for site name
 * Ask user for HTTP[S] options
 * Ask user for profile (e.g., react)
 * Ask user for domain names (zero or more)
 *
 * Add profile package to package.json (for installing)
 * Add src-dir to linc section in package.json
 *
 * Install (npm / yarn)
 *
 * Create site
 * Create error pages (placeholders)
 *
 * Write sample linc[.server].config.js
 *
 */
const initialise = (argv) => {

};


exports.command = 'init';
exports.desc = 'Initialise a LINC site';
exports.handler = (argv) => {
    initialise(argv);
};
