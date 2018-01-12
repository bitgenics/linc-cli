module.exports = (s) => ((!s || s.length === 0)
    // Nothing to suggest
    ? ''

    // Convert to lowercase string
    : s.toLowerCase()

        // trim whitespace around word
        .trim()

        // convert any non-compliant character to dash
        .replace(/[^a-z0-9-]/g, '-')

        // collapse multiple dashes into a single dash
        .replace(/([-])\1+/g, '$1')

        // limit string length to 63
        .replace(/^([0-9a-z][0-9a-z-]{1,61}[0-9a-z]).*$/g, '$1')

        // trim dashes around word
        .replace(/^-+|-+$/g, ''));
