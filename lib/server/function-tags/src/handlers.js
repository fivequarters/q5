const {
  execute_dynamo_batch_write,
  get_dynamo_create_request,
  get_dynamo_delete_request,
  scan_dynamo_function_tags,
} = require('./dynamo');

// Create all of the tags for a given function specification.
export function create_function_tags(options, spec, cb) {
  // Delete any legacy tags for this function
  return delete_function_tags(options, (e) => {
    if (e) {
      return cb(e);
    }
    // Create all of the new tags for this function
    return execute_dynamo_batch_write(get_dynamo_create_request(options, spec), cb);
  });
}

// Delete all of the tags for a given function specification
export function delete_function_tags(options, cb) {
  return scan_dynamo_function_tags(options, (e, entries) => {
    if (e) {
      return cb(e);
    }
    const request = [];

    // Create the deletion request for each of the unique key:value tuples.
    entries.forEach((e) => request.push(...get_dynamo_delete_request(e[0], e[1])));

    return execute_dynamo_batch_write(request, cb);
  });
}
