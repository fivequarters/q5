const { execute_dynamo_batch_write, get_dynamo_create_request, get_dynamo_delete_request } = require('./dynamo');

// Create all of the tags for a given function specification.
export function create_function_tags(options, spec, cb) {
  return execute_dynamo_batch_write(options, get_dynamo_create_request(options, spec), cb);
}

// Delete all of the tags for a given function specification
export function delete_function_tags(options, cb) {
  return execute_dynamo_batch_write(options, get_dynamo_delete_request(options), cb);
}
