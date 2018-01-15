/* eslint-disable indent */
const fs = require('fs');

/**
 * Client template
 */
const clientTemplate = () => `import reducer from './reducers';
import routes from './routes';
import thunk from 'redux-thunk'

//import 'bootstrap/dist/css/bootstrap.css';

const config = {
    redux: {
        reducer: reducer,
        middleware: [ thunk ]
    },
    router: {
        routes: routes
    }
};
`;

/**
 * Write client template
 * @param path
 */
// eslint-disable-next-line max-len
const writeClientTemplate = (path) => new Promise((resolve, reject) => fs.writeFile(`${path}/linc.config.js`, clientTemplate(), { encoding: 'utf-8' }, err => {
    if (err) return reject(err);

    return resolve();
}));

/**
 * Write server template
 * @param path
 * @returns {Promise<any>}
 */
// eslint-disable-next-line no-unused-vars,arrow-body-style
const writeServerTemplate = (path) => new Promise((resolve, reject) => {
    return resolve();
});

/**
 * Create files
 * @param path
 */
const createFiles = (path) => Promise.all([writeClientTemplate(path), writeServerTemplate(path)]);

module.exports = createFiles;
