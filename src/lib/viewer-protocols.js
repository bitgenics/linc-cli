module.exports = {
    A: {
        name: 'Redirect HTTP to HTTPS',
        policy: 'redirect-to-https',
    },
    B: {
        name: 'HTTP and HTTPS',
        policy: 'allow-all',
    },
    C: {
        name: 'HTTPS only',
        policy: 'https-only',
    },
};
