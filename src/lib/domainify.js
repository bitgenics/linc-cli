'use strict';

module.exports = (s) => {
    return (s.length === 0)
        // Nothing to suggest
        ? ''

        // Convert to string
        : (s + "")

            // trim whitespace around word
            .trim()

            // convert any non-compliant character to dash
            .replace(/[^A-Za-z0-9-]/g, '-')

            // collapse multiple dashes into a single dash
            .replace(/([-])\1+/g, '$1')

            // limit string length to 63
            .replace(/^([0-9a-zA-Z][0-9a-zA-Z-]{1,61}[0-9a-zA-Z]).*$/g, '$1')

            // trim dashes around word
            .replace(/^-+|-+$/g, '');
};