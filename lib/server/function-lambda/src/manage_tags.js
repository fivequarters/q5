const { DynamoDB } = require('aws-sdk');
const create_error = require('http-errors');

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

export const TAG_SEP = '/';
export const TAG_CATEGORY_BOUNDARY = 'function-tags-boundary';
export const TAG_CATEGORY_SUBSCRIPTION = 'function-tags-subscription';
const DYNAMO_BATCH_ITEMS_MAX = 25;
const DYNAMO_BACKOFF_TRIES_MAX = 5;
const DYNAMO_BACKOFF_DELAY = 2000;

export const keyValueTableName = `${process.env.DEPLOYMENT_KEY}.key-value`;

export const get_compute_tag_key = (key) => `compute.${key}`;
export const get_dependency_tag_key = (key) => `dependency.${key}`;
export const get_metadata_tag_key = (key) => `tag.${key}`;

export const encode = (v) => encodeURIComponent(v);

// Create an sort_key that can be prefix matched for across an entire subscription
export function get_sub_sort_key(options, key, value) {
  return [
    options.accountId,
    options.subscriptionId,
    encode(key),
    encode(value),
    options.boundaryId,
    options.functionId,
  ].join(TAG_SEP);
}

// Create an sort_key that can be prefix matched for within a specific boundary
export function get_bound_sort_key(options, key, value) {
  return [
    options.accountId,
    options.subscriptionId,
    options.boundaryId,
    encode(key),
    encode(value),
    options.functionId,
  ].join(TAG_SEP);
}

// Create an sort_key that can be prefix matched for across an entire subscription
export function get_sub_search_key(options, key, value) {
  if (value !== undefined) {
    return [options.accountId, options.subscriptionId, encode(key), encode(value)].join(TAG_SEP);
  } else {
    return [options.accountId, options.subscriptionId, encode(key)].join(TAG_SEP);
  }
}

// Create an sort_key that can be prefix matched for within a specific boundary
export function get_bound_search_key(options, key, value) {
  if (value !== undefined) {
    return [options.accountId, options.subscriptionId, options.boundaryId, encode(key), encode(value)].join(TAG_SEP);
  } else {
    return [options.accountId, options.subscriptionId, options.boundaryId, encode(key)].join(TAG_SEP);
  }
}

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
    let request = [];

    // Create the deletion request for each of the unique key:value tuples.
    entries.forEach((e) => request.push(...get_dynamo_delete_request(options, e[0], e[1])));

    return execute_dynamo_batch_write(request, cb);
  });
}

export function search_function_tags(options, key, value, next, limit, cb) {
  let continuationToken = undefined;
  let params = {
    TableName: keyValueTableName,
    ProjectionExpression: 'boundaryId, functionId, schedule',
    Limit: limit ? limit : 100,
    ExpressionAttributeNames: { '#k': 'key' },
    ExpressionAttributeValues: {
      ':searchCategory': { S: options.boundaryId ? TAG_CATEGORY_BOUNDARY : TAG_CATEGORY_SUBSCRIPTION },
      ':sortKeyPrefix': {
        S: options.boundaryId ? get_bound_search_key(options, key, value) : get_sub_search_key(options, key, value),
      },
    },
    KeyConditionExpression: `category = :searchCategory AND begins_with(#k, :sortKeyPrefix)`,
    ExclusiveStartKey: next ? JSON.parse(Buffer.from(decodeURIComponent(next), 'base64').toString('utf8')) : undefined,
  };

  dynamo.query(params, (e, d) => {
    if (e) return cb(e);
    return cb(
      null,
      d.Items.map((i) => {
        try {
          return {
            boundaryId: i.boundaryId.S,
            functionId: i.functionId.S,
            schedule: i.schedule ? JSON.parse(i.schedule.S) : undefined,
          };
        } catch (e) {
          // Defensive, in case the JSON in schedule isn't parsable.
          return {
            boundaryId: i.boundaryId.S,
            functionId: i.functionId.S,
          };
        }
      }),
      d.LastEvaluatedKey
        ? encodeURIComponent(Buffer.from(JSON.stringify(d.LastEvaluatedKey)).toString('base64'))
        : undefined
    );
  });
}

export function get_dynamo_create_request(options, spec) {
  let request = [];
  const tags = convert_spec_to_tags(spec);

  Object.entries(tags).forEach(([k, v]) => {
    request.push(...get_dynamo_put_request(options, k, v));
  });

  return request;
}

// Repeatedly write the contents of request until all of the items have been acknowledged by DynamoDB.
function execute_dynamo_batch_write(items, cb, backoff = 0) {
  if (items.length === 0) {
    return cb();
  }

  setTimeout(() => {
    // Only send DYNAMO_BATCH_ITEMS_MAX at once, storing the rest in overflow to be sent after this request
    // completes.
    let overflow = items.slice(DYNAMO_BATCH_ITEMS_MAX);
    items = items.slice(0, DYNAMO_BATCH_ITEMS_MAX);

    dynamo.batchWriteItem({ RequestItems: { [keyValueTableName]: items } }, (e, d) => {
      if (e) return cb(e);

      if (Object.keys(d.UnprocessedItems).length > 0) {
        // Some entries didn't get processed; try again (and save the overflow).
        if (backoff > DYNAMO_BACKOFF_TRIES_MAX) {
          return cb(create_error(503, 'Unable to write tags, exhausted allowed attempts'));
        }
        d.UnprocessedItems[keyValueTableName].push(...overflow);
        return execute_dynamo_batch_write(d.UnprocessedItems[keyValueTableName], cb, backoff + 1);
      } else if (Object.keys(overflow).length > 0) {
        // Not a failure, so don't bump backoff - send any of the overflow entries that got trimmed.
        return execute_dynamo_batch_write(overflow, cb, backoff);
      }

      // All items successfully written.
      cb();
    });
  }, backoff * DYNAMO_BACKOFF_DELAY);
}

function scan_dynamo_function_tags(options, cb, results = [], lastEvaluatedKey = undefined) {
  return dynamo.scan(
    {
      TableName: keyValueTableName,
      ProjectionExpression: 'category, #k',
      ExpressionAttributeNames: { '#k': 'key' },
      ExpressionAttributeValues: {
        ':c1': { S: TAG_CATEGORY_BOUNDARY },
        ':c2': { S: TAG_CATEGORY_SUBSCRIPTION },
        ':a': { S: options.accountId },
        ':s': { S: options.subscriptionId },
        ':b': { S: options.boundaryId },
        ':f': { S: options.functionId },
      },
      ExclusiveStartKey: lastEvaluatedKey,
      FilterExpression:
        '(category = :c1 OR category = :c2) AND accountId = :a AND subscriptionId = :s' +
        '  AND boundaryId = :b AND functionId = :f',
    },
    (e, d) => {
      if (e) {
        return cb(e);
      }

      // Collect the items found for future deletion.
      d.Items.forEach((t) => {
        results.push([t.category.S, t.key.S]);
      });

      // Continue scanning and accumulating results.
      if (d.LastEvaluatedKey) {
        return scan_dynamo_function_tags(options, cb, results, d.LastEvaluatedKey);
      }

      // Scan completed, return results.
      return cb(null, results);
    }
  );
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

  // Create a tag for cron
  if (spec.schedule && spec.schedule.cron) {
    tags['cron'] = true;
    tags['cron.schedule'] = JSON.stringify(spec.schedule);
  } else {
    tags['cron'] = false;
  }

  return tags;
}

// Convert a key:value pair into a delete request for DynamoDB.
function get_dynamo_delete_request(options, category, key) {
  return [
    {
      DeleteRequest: {
        Key: {
          category: {
            S: category,
          },
          key: {
            S: key,
          },
        },
      },
    },
  ];
}

// Convert a key:value pair into a put request for DynamoDB.
function get_dynamo_put_request(options, key, value) {
  const promoted = get_dynamo_promoted_attributes(options, key, value);
  return [
    {
      PutRequest: {
        Item: {
          category: {
            S: TAG_CATEGORY_BOUNDARY,
          },
          key: {
            S: get_bound_sort_key(options, key, value),
          },
          ...promoted,
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
            S: get_sub_sort_key(options, key, value),
          },
          ...promoted,
        },
      },
    },
  ];
}

// Some elements of options get promoted into columns in the entries for future filter operations.
function get_dynamo_promoted_attributes(options, key, value) {
  return {
    tagKey: { S: key },
    tagValue: to_dynamo(value),
    accountId: { S: options.accountId },
    subscriptionId: { S: options.subscriptionId },
    boundaryId: { S: options.boundaryId },
    functionId: { S: options.functionId },
    schedule: { S: JSON.stringify(options.schedule) },
  };
}

// Utility function to appropriately type
function to_dynamo(value) {
  if (typeof value == 'number') return { N: `${value}` };
  if (typeof value == 'boolean') return { BOOL: value };
  if (typeof value == 'string') return { S: value };
  if (typeof value == 'object' && value == null) return { NULL: true };
}
