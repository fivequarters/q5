const Assert = require('assert');
const { Common, getTaskStatistics } = require('@5qtrs/runtime-common');
const Constants = require('@5qtrs/constants');
const Tags = require('@5qtrs/function-tags');
const create_error = require('http-errors');
const Async = require('async');

export function get_function(req, res, next) {
  return Async.waterfall(
    [
      (cb) =>
        get_function_core(req.params, (e, functionSpec) => {
          if (e) {
            if (e.code === 'NoSuchKey') {
              return cb(create_error(404));
            } else {
              return cb(create_error(500, `Error getting function: ${e.message}.`));
            }
          }

          moveMetadataToSerialized(functionSpec, 'compute', 'computeSettings');
          moveMetadataToSerialized(functionSpec, 'configuration', 'applicationSettings');
          moveMetadataToSerialized(functionSpec, 'schedule', 'cronSettings');

          if (req.query.include !== 'all') {
            delete functionSpec.computeSerialized;
            delete functionSpec.configurationSerialized;
            delete functionSpec.scheduleSerialized;
          }

          removeEmptyValues(functionSpec, 'compute', 'computeSettings');
          removeEmptyValues(functionSpec, 'configuration', 'applicationSettings');
          removeEmptyValues(functionSpec, 'schedule', 'cronSettings');

          if (
            functionSpec.metadata &&
            functionSpec.metadata.fusebit &&
            Object.keys(functionSpec.metadata.fusebit).length === 0
          ) {
            delete functionSpec.metadata.fusebit;
          }

          if (functionSpec.metadata && Object.keys(functionSpec.metadata).length === 0) {
            delete functionSpec.metadata;
          }

          cb(null, functionSpec);
        }),
      (spec, cb) => add_task_statistics(req, spec, cb),
    ],
    (e, spec) => {
      if (e) return next(e);
      res.status(200);
      return res.json(spec);
    }
  );
}

function add_task_statistics(req, spec, cb) {
  if (req.query.include !== 'task') {
    return cb(null, spec);
  }
  const taskRoutes = ((spec.runtime?.tags?.routes && JSON.parse(spec.runtime?.tags?.routes)) || []).filter(
    (r) => !!r.task
  );
  return Async.eachLimit(
    taskRoutes,
    5,
    async (route) => {
      route.task.stats = await getTaskStatistics(route.task);
      delete route.task.queue;
      delete route.task.stats.expiry;
    },
    (e) => (e ? cb(e) : cb(null, { routes: taskRoutes }))
  );
}

export function get_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscription must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundary must be specified');
  Assert.ok(options.boundaryId.match(Constants.valid_boundary_name), 'boundary name must be value');
  Assert.equal(typeof options.functionId, 'string', 'function name must be specified');
  Assert.ok(options.functionId.match(Constants.valid_function_name), 'function name must be valid');

  return Common.S3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Constants.get_user_function_spec_key(options),
    },
    (e, d) => {
      if (e) return cb(e);
      try {
        d.Body = JSON.parse(d.Body.toString('utf8'));
      } catch (e) {
        return cb(e);
      }
      if (d.Body.lambda && !d.Body.compute) {
        d.Body.compute = d.Body.lambda;
      }
      delete d.Body.lambda;

      if (d.Body.compute) {
        delete d.Body.compute.runtime;
        if (d.Body.compute.memory_size) {
          d.Body.compute.memorySize = d.Body.compute.memory_size;
          delete d.Body.compute.memory_size;
        }
      }

      d.Body.runtime = { tags: Tags.Constants.convert_spec_to_tags(d.Body) };

      if (!options.includeInternal) {
        delete d.Body.internal;
      }
      delete d.Body.buildId;
      delete d.Body.functionId;

      return Tags.get_function_tags(
        {
          accountId: options.accountId,
          subscriptionId: options.subscriptionId,
          boundaryId: options.boundaryId,
          functionId: options.functionId,
        },
        (e, functionSummary) => {
          d.Body.runtime.tags['ephemeral.redirect'] = functionSummary['ephemeral.redirect'];
          return cb(null, d.Body);
        }
      );
    }
  );
}

function moveMetadataToSerialized(functionSpec, key, metadataKey) {
  const serializedKey = `${key}Serialized`;
  if (functionSpec.metadata && functionSpec.metadata.fusebit && functionSpec.metadata.fusebit[metadataKey]) {
    functionSpec[serializedKey] = functionSpec.metadata.fusebit[metadataKey];
    delete functionSpec.metadata.fusebit[metadataKey];
  }
}

function removeEmptyValues(functionSpec, key, metadataKey) {
  const serializedKey = `${key}Serialized`;
  if (!functionSpec[serializedKey]) {
    delete functionSpec[serializedKey];
  }

  if (functionSpec.metadata && functionSpec.metadata.fusebit && !functionSpec.metadata.fusebit[metadataKey]) {
    delete functionSpec.metadata.fusebit[metadataKey];
  }

  if (functionSpec[key] && Object.keys(functionSpec[key]).length === 0) {
    delete functionSpec[key];
  }
}
