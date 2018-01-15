const prompt = require('prompt');

prompt.colors = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * User confirmation
 */
module.exports = () => new Promise((resolve, reject) => {
    const schema = {
        properties: {
            ok: {
                description: 'Is this OK?',
                default: 'Y',
                type: 'string',
            },
        },
    };
    prompt.start();
    prompt.get(schema, (err, result) => {
        if (err) return reject(err);

        return resolve(result);
    });
});
