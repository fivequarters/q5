const { DynamoDB } = require('aws-sdk');
const create_error = require('http-errors');

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

const TAG_SEP = '/';
export const TAG_CATEGORY_BOUNDARY = 'function-tags-boundary';
export const TAG_CATEGORY_SUBSCRIPTION = 'function-tags-subscription';
const DYNAMO_BATCH_ITEMS_MAX = 25;
const DYNAMO_BACKOFF_TRIES_MAX = 5;
const DYNAMO_BACKOFF_DELAY = 2000;

export const keyValueTableName = `${process.env.DEPLOYMENT_KEY}.key-value`;

// Create an sort_key that can be prefix matched for across an entire subscription
function create_subscription_sort_key(options, key, value) {
  return [options.accountId, options.subscriptionId, key, value, options.boundaryId, options.functionId].join(TAG_SEP);
}

// Create an sort_key that can be prefix matched for within a specific boundary
function create_boundary_sort_key(options, key, value) {
  return [options.accountId, options.subscriptionId, options.boundaryId, key, value, options.functionId].join(TAG_SEP);
}

// Create an search keys, optionally including the value (or a trailing TAG_SEP if not).
export function create_subscription_search_key(options, key, value) {
  return [options.accountId, options.subscriptionId, key, value].join(TAG_SEP) + (value ? TAG_SEP : '');
}
export function create_boundary_search_key(options, key, value) {
  return (
    [options.accountId, options.subscriptionId, options.boundaryId, key, value].join(TAG_SEP) + (value ? TAG_SEP : '')
  );
}

// Create all of the tags for a given function specification.
export function create_function_tags(options, spec, cb) {
  const tags = convert_spec_to_tags(spec);

  return update_function_tags(options, {}, tags, cb);
}

// Delete all of the tags for a given function specification
export function delete_tags(options, spec, cb) {
  const tags = convert_spec_to_tags(spec);

  return update_function_tags(options, tags, {}, cb);
}

// When the function specification changes, update the tags.
export function update_function_tags(options, old_spec, new_spec, cb) {
  const request = create_function_tag_request(options, old_spec, new_spec, cb);

  return perform_request(request, cb);
}

export function create_function_tag_request(options, old_spec, new_spec) {
  const old_tags = convert_spec_to_tags(old_spec);
  const new_tags = convert_spec_to_tags(new_spec);

  // Generate the patch; because the value is part of the sort_key, delete old records where the value has
  // changed, and create new records for the new value.

  // Create the list of tags to delete:
  let del_tags = {};
  for (let t in old_tags) {
    if (new_tags[t] === undefined || new_tags[t] !== old_tags[t]) {
      del_tags[t] = old_tags[t];
    }
  }

  // And list of tags to add:
  let add_tags = {};
  for (let t in new_tags) {
    if (old_tags[t] === undefined || new_tags[t] !== old_tags[t]) {
      add_tags[t] = new_tags[t];
    }
  }

  // Convert the two lists into a DyanmoDB BatchWriteItem request
  let request = { RequestItems: { [keyValueTableName]: [] } };
  Object.entries(del_tags).forEach(([k, v]) => {
    request.RequestItems[keyValueTableName].push(...create_dynamo_delete_request(options, k, v));
  });
  Object.entries(add_tags).forEach(([k, v]) => {
    request.RequestItems[keyValueTableName].push(...create_dynamo_put_request(options, k, v));
  });

  return request;
}

// Repeatedly write the contents of request until all of the items have been acknowledged by DynamoDB.
function perform_request(items, cb, backoff = 0) {
  setTimeout(() => {
    // Only send DYNAMO_BATCH_ITEMS_MAX at once, storing the rest in overflow to be sent after this request
    // completes.
    let overflow = items.slice(DYNAMO_BATCH_ITEMS_MAX);
    items = items.slice(0, DYNAMO_BATCH_ITEMS_MAX);

    Common.Dynamo.BatchWriteItem({ RequestItems: { [keyValueTableName]: items } }, (e, d) => {
      if (e) return cb(e);

      if (Object.keys(d.UnprocessedItems).length > 0) {
        // Some entries didn't get processed; try again (and save the overflow).
        if (backoff > DYNAMO_BACKOFF_TRIES_MAX) {
          return cb(create_error(503, 'Unable to write tags, exhausted allowed attempts'));
        }

        return perform_request(d.UnprocessedItems.push(...overflow), cb, backoff + 1);
      } else if (Object.keys(overflow).length > 0) {
        // Not a failure, so don't bump backoff - send any of the overflow entries that got trimmed.
        return perform_request(overflow, cb, backoff);
      }

      // All items successfully written.
      cb();
    });
  }, backoff * DYNAMO_BACKOFF_DELAY);
}

export function get_compute_tag_key(key) {
  return `compute.${key}`;
}
export function get_dependency_tag_key(key) {
  return `dependency.${key}`;
}
export function get_metadata_tag_key(key) {
  return `tag.${key}`;
}

// Convert a function specification into a set of key:value pairs in tags.
export function convert_spec_to_tags(spec) {
  let tags = {};

  // Collect tags from the compute structure
  if (spec.compute) {
    const computeTags = ['memorySize', 'timeout', 'staticIp', 'runtime'];
    for (let t of computeTags) {
      if (t in spec.compute) {
        tags[get_compute_tag_key(t)] = spec.compute[t];
      }
    }
  }

  // Collect tags from the dependencies
  if (spec.internal && spec.internal.dependencies && spec.internal.resolved_dependencies) {
    for (let t in spec.internal.dependencies) {
      tags[get_dependency_tag_key(t)] = spec.internal.resolved_dependencies[t];
    }
  }

  // Collect tags from the customer-specified tags
  if (spec.metadata && spec.metadata.tags) {
    for (let t in spec.metadata.tags) {
      tags[get_metadata_tag_key(t)] = spec.metadata.tags[t];
    }
  }

  return tags;
}

// Convert a key:value pair into a delete request for DynamoDB.
function create_dynamo_delete_request(options, key, value) {
  return [
    {
      DeleteRequest: {
        Key: {
          category: {
            S: TAG_CATEGORY_BOUNDARY,
          },
          key: {
            S: create_boundary_sort_key(options, key, value),
          },
        },
      },
    },
    {
      DeleteRequest: {
        Key: {
          category: {
            S: TAG_CATEGORY_SUBSCRIPTION,
          },
          key: {
            S: create_subscription_sort_key(options, key, value),
          },
        },
      },
    },
  ];
}

// Convert a key:value pair into a put request for DynamoDB.
function create_dynamo_put_request(options, key, value) {
  return [
    {
      PutRequest: {
        Item: {
          category: {
            S: TAG_CATEGORY_BOUNDARY,
          },
          key: {
            S: create_boundary_sort_key(options, key, value),
          },
          ...create_dynamo_promoted_elements(options, key, value),
        },
      },
    },
    {
      PutRequest: {
        Item: {
          category: {
            S: TAG_CATEGORY_SUBSCRIPTION,
          },
          key: {
            S: create_subscription_sort_key(options, key, value),
          },
          ...create_dynamo_promoted_elements(options, key, value),
        },
      },
    },
  ];
}

// Some elements of options get promoted into columns in the entries for future filter operations.
function create_dynamo_promoted_elements(options, key, value) {
  return {
    tagKey: { S: key },
    tagValue: to_dynamo(value),
    boundaryId: { S: options.boundaryId },
    functionId: { S: options.functionId },
  };
}

// Utility function to appropriately type
function to_dynamo(value) {
  if (typeof value == 'number') return { N: `${value}` };
  if (typeof value == 'boolean') return { BOOL: value };
  if (typeof value == 'string') return { S: value };
  if (typeof value == 'object' && value == null) return { NULL: true };
}
