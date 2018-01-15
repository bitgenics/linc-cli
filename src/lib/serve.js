/* eslint-disable global-require */
// eslint-disable global-require
const path = require('path');
const fs = require('fs');
const os = require('os');
const Libhoney = require('libhoney').default;
const openBrowser = require('react-dev-utils/openBrowser');
const vm = require('linc-vm');

const SERVE_URL = 'http://localhost:3000';

/**
 * Get options
 */
const getOptions = () => {
    const settingsFile = path.join(process.cwd(), 'site-settings.json');
    try {
        const settings = fs.readFileSync(settingsFile, { encoding: 'utf-8' });
        return JSON.parse(settings);
    } catch (e) {
        return {};
    }
};

/**
 * Create renderer
 * @param rendererPath
 * @param settings
 */
function createRenderer(rendererPath, settings) {
    if (!rendererPath) {
        throw new TypeError('rendererPath required');
    }

    if (typeof rendererPath !== 'string') {
        throw new TypeError('rendererPath must be a string');
    }

    const src = fs.readFileSync(rendererPath);
    const renderer = vm.createReuseableRenderer(src, settings);

    return (req, res) => {
        if (renderer.doGeoLookup && renderer.doGeoLookup(req)) {
            req.userInfo = {
                ip: '127.0.0.1',
                msg: 'This will contain actual user location information in production',
            };
        }
        renderer.renderGet(req, res, settings);
    };
}

/**
 * Serve site locally
 */
module.exports = () => {
    const express = require('express');
    const compression = require('compression');
    const EventCollector = require('event-collector');

    const hny = new Libhoney({
        writeKey: process.env.HONEYCOMB_WRITE_KEY,
        dataset: process.env.HONEYCOMB_DATASET || 'linc-local-serve',
        disabled: !process.env.HONEYCOMB_WRITE_KEY,
    });
    hny.add({
        node_version: process.version,
        os_cpus_amount: os.cpus().length,
        os_cpus_model: os.cpus()[0].model,
        os_cpus_speed: os.cpus()[0].speed,
        os_hostname: os.hostname(),
    });
    hny.addDynamicField('os_freemem', os.freemem);
    hny.addDynamicField('os_loadavg', os.loadavg);
    hny.addDynamicField('os_totalmem', os.totalmem);

    const app = express();

    const renderer = path.resolve(process.cwd(), 'dist', 'lib', 'server-render.js');
    const options = getOptions();

    app.use(compression());
    app.use(express.static(path.resolve(process.cwd(), 'dist', 'static')));
    app.use(EventCollector.express({}, (eventcollector) => {
        const event = eventcollector.getEvent();
        console.log(JSON.stringify(event, null, 2));
        const hnyEvent = hny.newEvent().add(event);
        hnyEvent.timestamp = event.time_date;
        hnyEvent.send();
    }));
    app.use('/', createRenderer(renderer, options));

    app.listen(3000, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log(`Listening on ${SERVE_URL}`);
            openBrowser(SERVE_URL);
        }
    });
};
