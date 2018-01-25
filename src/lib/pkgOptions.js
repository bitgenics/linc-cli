/* eslint-disable no-param-reassign */
const _ = require('underscore');
const ora = require('ora');
const prompt = require('prompt');
const request = require('request');
const readPkg = require('read-pkg');
const writePkg = require('write-pkg');
const authorisify = require('../lib/authorisify');
const config = require('../config/config.json');
const domainify = require('./domainify');
const installProfilePackage = require('../lib/install-profile-pkg');
const lincProfiles = require('./linc-profiles');

const LINC_API_SITES_ENDPOINT = `${config.Api.LincBaseEndpoint}/sites`;

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * Get site name from user
 * @param dflt
 */
const getName = (dflt) => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            name: {
                // Pattern AWS uses for host names.
                pattern: /^(?!-)[a-z0-9-]{0,62}[a-z0-9]$/,
                default: dflt,
                description: 'Name of site to create:',
                message: 'Only a-z, 0-9 and - are allowed characters. Cannot start/end with -.',
                required: true,
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.name);
    });
});

/**
 * Check whether a site name already exists.
 * @param siteName
 */
const checkSiteName = (siteName) => new Promise((resolve, reject) => {
    const spinner = ora('Checking availability of name. Please wait...');
    spinner.start();

    const options = {
        method: 'GET',
        url: `${LINC_API_SITES_ENDPOINT}/${siteName}/exists`,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    request(options, (err, response, body) => {
        if (err) {
            spinner.fail('Oops. Something went wrong!');
            return reject(err);
        }

        const json = JSON.parse(body);
        if (response.statusCode === 200) {
            if (json.exists) {
                spinner.fail('The chosen site name is already in use. Stop.');
            } else {
                spinner.succeed('The chosen site name is still free.');
            }
            return resolve(json.exists);
        }

        spinner.fail('Oops. Something went wrong!');
        return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
    });
});

/**
 * Create a new site in the backend.
 * @param siteName
 */
const createNewSite = (siteName) => (jwtToken) => new Promise((resolve, reject) => {
    const body = {
        name: siteName,
    };
    const options = {
        method: 'POST',
        url: LINC_API_SITES_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `X-Bearer ${jwtToken}`,
        },
        body: JSON.stringify(body),
    };
    request(options, (err, response, _body) => {
        if (err) return reject(err);

        const json = JSON.parse(_body);
        if (json.error) return reject(new Error(json.error));
        if (response.statusCode !== 200) {
            return reject(new Error(`Error ${response.statusCode}: ${response.statusMessage}`));
        }

        return resolve(json);
    });
});

/**
 * Handler name option
 * @param pkg
 */
const nameHandler = async (pkg) => {
    pkg.linc = pkg.linc || {};

    const name = await getName(domainify(pkg.name));
    pkg.linc.siteName = name;
    const exists = checkSiteName(name);
    if (exists) {
        console.log('This name is already in use.');
        process.exit(255);
    }
    return authorisify(createNewSite(pkg.linc.siteName));
};

/**
 * Show profiles available
 */
const showProfiles = () => {
    console.log(`Please choose a profile:
`);
    _.each(lincProfiles, (p, k) => { console.log(`${k}) ${p.name}`); });
};

/**
 * Ask for name of "Other" profile
 */
const askOtherProfile = () => new Promise((resolve, reject) => {
    console.log();

    const schema = {
        properties: {
            profile: {
                description: '\nProfile name to use for this site:',
                message: 'Please enter a valid option',
                type: 'string',
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result.profile);
    });
});

/**
 * Ask for profile
 */
const askProfile = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            profile: {
                pattern: /^[A-Za-z]$/,
                description: 'Profile to use for this site:',
                message: 'Please enter a valid option',
                type: 'string',
                default: 'A',
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return result.profile;
    });
});

/**
 * Ask which profile to use
 * @param pkg
 */
const profileHandler = async (pkg) => {
    pkg.linc = pkg.linc || {};

    showProfiles();

    const selectedProfile = await askProfile();
    let profile = lincProfiles[selectedProfile].pkg;
    if (profile) {
        pkg.linc.buildProfile = profile;

        return installProfilePackage(profile);
    }

    profile = await askOtherProfile();
    pkg.linc.buildProfile = profile;
    return installProfilePackage(profile);
};

/**
 * Options we have and their handlers
 */
const availableOptions = {
    siteName: nameHandler,
    buildProfile: profileHandler,
};

/**
 * Core function that handles the options
 * @param opts
 * @param pkg
 */
const handleOptions = async (opts, pkg) => {
    const options = opts;

    const handleOption = async () => {
        if (_.isEmpty(options)) return pkg;

        const option = options.shift();
        if (pkg.linc[option]) return pkg;

        const handler = availableOptions[option];
        if (!handler) throw new Error('Unknown option provided!');

        await handler(pkg);
        return handleOption();
    };

    return handleOption();
};

/**
 * Option handler
 * @param opts
 */
module.exports = async (opts) => {
    const packageJson = await readPkg();
    packageJson.linc = packageJson.linc || {};
    await handleOptions(opts, packageJson);
    await writePkg(packageJson);
    return packageJson;
};
