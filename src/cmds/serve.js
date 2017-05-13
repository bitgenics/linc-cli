'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const Libhoney = require('libhoney').default;
const notice = require('../lib/notice');
const assertPkg = require('../lib/package-json').assert;

const getOptions = () => {
    const settingsFile = path.join(process.cwd(), 'site-settings.json');
    try {
        const settings = fs.readFileSync(settingsFile, {encoding: 'utf-8'});
        const jsonObj = JSON.parse(settings);
        return jsonObj;
    } catch (e) {
        return {};
    }
};

const serve = (argv) => {
    const express = require('express');
    const ssr = require('linc-simple-express');
    const compression = require('compression');
    const EventCollector = require('event-collector');

    const hny = new Libhoney({
        writeKey: process.env.HONEYCOMB_WRITE_KEY,
        dataset: process.env.HONEYCOMB_DATASET || 'linc-local-serve',
        disabled: !process.env.HONEYCOMB_WRITE_KEY
    });
    hny.add({
        node_version: process.version,
        os_cups_amount: os.cpus().length,
        os_cpus_model: os.cpus()[0].model,
        os_cpus_speed: os.cpus()[0].speed,
        os_hostname: os.hostname()
    });
    hny.addDynamicField('os_freemem', os.freemem);
    hny.addDynamicField('os_loadavg', os.loadavg);
    hny.addDynamicField('os_totalmem', os.totalmem);

    const app = express();

    const renderer = path.resolve(process.cwd(), 'dist', 'lib', 'server-render.js');
    const options = getOptions();

    app.use(compression());
    app.use('/_assets', express.static(path.resolve(process.cwd(), 'dist', 'static', '_assets')));
    app.use(EventCollector.express({}, (eventcollector) => {
        console.log(JSON.stringify(eventcollector, null, 2));
        const event = hny.newEvent().add(eventcollector);
        event.timestamp = eventcollector.time_date
        event.send();
    }));
    app.use('/', ssr(renderer, options));

    app.listen(3000, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log('Listing on http://localhost:3000');
        }
    });
};

exports.command = 'serve';
exports.desc = 'Run a Linc server locally';
exports.handler = (argv) => {
    assertPkg();

    notice();

    serve(argv);
};
