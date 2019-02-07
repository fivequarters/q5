var Assert = require('assert');
var handler = require('./index');

exports.execute = function execute(event, context, cb) {
    try {
        Assert.equal(typeof handler, 'function', 'The module export must be a function.');
        Assert.equal(handler.length, 2, 'The function must take two parameters: (ctx, cb).');

        event.configuration = process.env;

        return handler(event, cb);
    }
    catch (e) {
        console.error('SYNCHRONOUS EXECUTION ERROR', e);
        return cb(e);
    }
};
