const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');

module.exports = function lambda_get_function(req, res, next) {
  return module.exports.core(req.params, (e, functionSpec) => {
    if (e) {
      if (e.code === 'NoSuchKey') {
        return next(create_error(404));
      } else {
        return next(create_error(500, `Error getting function: ${e.message}.`));
      }
    }
    const userAgent = req.userAgent;
    if (
      (userAgent.isFusebitCli && !userAgent.isAtLeastVersion(1, 0, 2)) ||
      (userAgent.isFusebitEditor && !userAgent.isAtLeastVersion(1, 0, 1))
    ) {
      // Early versions of editor and CLI expect serialized values as metadata
      moveSerializedToMetadata(functionSpec, 'compute', 'computeSettings');
      moveSerializedToMetadata(functionSpec, 'configuration', 'applicationSettings');
      moveSerializedToMetadata(functionSpec, 'schedule', 'cronSettings');
    } else {
      // For functions saved before the introduction of the serialized feature
      moveMetadataToSerialized(functionSpec, 'compute', 'computeSettings');
      moveMetadataToSerialized(functionSpec, 'configuration', 'applicationSettings');
      moveMetadataToSerialized(functionSpec, 'schedule', 'cronSettings');
    }

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

    res.status(200);
    return res.json(functionSpec);
  });
};

module.exports.core = function lambda_get_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscription must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundary must be specified');
  Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundary name must be value');
  Assert.equal(typeof options.functionId, 'string', 'function name must be specified');
  Assert.ok(options.functionId.match(Common.valid_function_name), 'function name must be valid');

  return Common.S3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_spec_key(options),
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

      delete d.Body.internal;
      delete d.Body.buildId;
      delete d.Body.functionId;

      return cb(null, d.Body);
    }
  );
};

function moveSerializedToMetadata(functionSpec, key, metadataKey) {
  const serializedKey = `${key}Serialized`;
  if (functionSpec[serializedKey]) {
    functionSpec.metadata = functionSpec.metadata || {};
    functionSpec.metadata.fusebit = functionSpec.metadata.fusebit || {};
    functionSpec.metadata.fusebit[metadataKey] = functionSpec[serializedKey];
    delete functionSpec[serializedKey];
  }
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
