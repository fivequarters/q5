const Assert = require('assert');
const Async = require('async');
const Common = require('./common');
const create_error = require('http-errors');

module.exports = function lambda_list_functions(req, res, next) {
    return module.exports.core({
        boundary: req.params.boundary,
        from: req.query.from,
        limit: isNaN(req.query.limit) ? undefined : +req.query.limit,
    }, (e, r) => {
        if (e) {
            return next(create_error(500, `Error getting function: ${e.message}.`));
        }
        res.status(200);
        return res.json(r);
    });
};

module.exports.core = function lambda_list_functions_core(options, cb) {
    Assert.ok(options);
    Assert.equal(typeof(options.boundary), 'string', 'options.boundary must be specified');
    Assert.ok(options.boundary.match(Common.valid_boundary_name), 'boundary name must be value');
    if (options.from) {
        Assert.ok(typeof(options.from) === 'string', 'starting function name must be a string if specified');
        Assert.ok(options.from.match(Common.valid_function_name), 'starting function name must be valid if specified');
    }

    var list_params = {
        Prefix: `${Common.function_spec_key_prefix}/${options.boundary}/`,
        MaxKeys: Math.min((options.limit || +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS), +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS),
    };

    if (options.from) {
        list_params.StartAfter = `${Common.function_spec_key_prefix}/${options.boundary}/${options.from}`;
    }

    return Common.S3.listObjectsV2(list_params, (e, docs) => {
        if (e) return cb(e);
        return cb(null, {
            has_more: docs.IsTruncated,
            functions: docs.Contents.map(x => x.Key.split('/')[2])
        });
    });
};
