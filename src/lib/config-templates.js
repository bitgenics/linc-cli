'use strict';
const fs = require('fs');

const clientTemplate = () =>
`import reducer from './reducers';
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

const writeClientTemplate = (path) => new Promise((resolve, reject) => {
    return fs.writeFile(`${path}/linc.config.js`, clientTemplate(), { encoding: 'utf-8' }, err => {
        if (err) return reject(err);
        else return resolve();
    });
});

const writeServerTemplate = (path) => new Promise((resolve, reject) => {
    return resolve();
});

const createFiles = (path) => Promise.all([ writeClientTemplate(path), writeServerTemplate(path) ]);

module.exports = createFiles;
