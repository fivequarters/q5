const { DynamoDB } = require('aws-sdk');

const DYNAMO_BATCH_ITEMS_MAX = 25;
const DYNAMO_BACKOFF_TRIES_MAX = 5;
const DYNAMO_BACKOFF_DELAY = 300;
const expBackoff = (c) => Math.pow(2, c - 1) * DYNAMO_BACKOFF_DELAY;

exports.dynamo = new DynamoDB({
  apiVersion: '2012-08-10',
  httpOptions: {
    timeout: 5000,
  },
  maxRetries: 3,
});

const dynamo = exports.dynamo;

export function get_dynamo_create_request(options, spec) {
  const tags = convert_spec_to_tags(spec);

  const request = [get_dynamo_put_function_request(options, tags)];

  Object.entries(tags).forEach(([k, v]) => {
    request.push(...get_dynamo_put_request(options, k, v));
  });

  return request;
}

// Repeatedly write the contents of request until all of the items have been acknowledged by DynamoDB.
export function execute_dynamo_batch_write(items, cb, backoff = 0) {
  if (items.length === 0) {
    return cb();
  }

  setTimeout(
    () => {
      // Only send DYNAMO_BATCH_ITEMS_MAX at once, storing the rest in overflow to be sent after this request
      // completes.
      const overflow = items.slice(DYNAMO_BATCH_ITEMS_MAX);
      items = items.slice(0, DYNAMO_BATCH_ITEMS_MAX);

      (options.dynamo || dynamo).batchWriteItem({ RequestItems: { [keyValueTableName]: items } }, (e, d) => {
        if (e) {
          // InternalServerErrors apparently just 'happen' with DynamoDB sometimes
          if (!e.retryable) {
            return cb(e);
          }

          // Retry all of the items
          d = { UnprocessedItems: { [keyValueTableName]: items } };
        }

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
        return cb();
      });
    },
    backoff > 0 ? expBackoff(backoff) : 0
  );
}

export function scan_dynamo_function_tags(options, cb, results = [], lastEvaluatedKey = undefined, backoff = 0) {
  setTimeout(
    () => {
      return (options.dynamo || dynamo).scan(
        {
          TableName: keyValueTableName,
          ProjectionExpression: 'category, #k',
          ExpressionAttributeNames: { '#k': 'key' },
          ExpressionAttributeValues: {
            ':c1': { S: TAG_CATEGORY_BOUNDARY },
            ':c2': { S: TAG_CATEGORY_SUBSCRIPTION },
            ':c3': { S: TAG_CATEGORY_FUNCTION },
            ':a': { S: options.accountId },
            ':s': { S: options.subscriptionId },
            ':b': { S: options.boundaryId },
            ':f': { S: options.functionId },
          },
          ExclusiveStartKey: lastEvaluatedKey,
          FilterExpression:
            '(category = :c1 OR category = :c2 OR category = :c3) AND accountId = :a AND subscriptionId = :s' +
            '  AND boundaryId = :b AND functionId = :f',
        },
        (e, d) => {
          if (e) {
            if (e.retryable) {
              // Some entries didn't get processed; try again (and save the overflow).
              if (backoff > DYNAMO_BACKOFF_TRIES_MAX) {
                return cb(create_error(503, 'Unable to scan tags, exhausted allowed attempts'));
              }
              return scan_dynamo_function_tags(options, cb, results, lastEvaluatedKey, backoff + 1);
            }

            return cb(e);
          }

          // Collect the items found for future deletion.
          d.Items.forEach((t) => {
            results.push([t.category.S, t.key.S]);
          });

          // Continue scanning and accumulating results.
          if (d.LastEvaluatedKey) {
            return scan_dynamo_function_tags(options, cb, results, d.LastEvaluatedKey, backoff);
          }

          // Scan completed, return results.
          return cb(null, results);
        }
      );
    },
    backoff > 0 ? expBackoff(backoff) : 0
  );
}

// Convert a key:value pair into a delete request for DynamoDB.
export function get_dynamo_delete_request(category, key) {
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

function get_dynamo_put_function_request(options, tags) {
  const promoted = get_dynamo_promoted_attributes(options);
  return {
    PutRequest: {
      Item: {
        category: {
          S: TAG_CATEGORY_FUNCTION,
        },
        key: {
          S: get_func_sort_key(options),
        },
        ...promoted,
      },
    },
  };
}

// Some elements of options get promoted into columns in the entries for future filter operations.
function get_dynamo_promoted_attributes(options, key, value) {
  return {
    tagKey: key ? { S: key } : undefined,
    tagValue: value ? to_dynamo(value) : undefined,
    accountId: { S: options.accountId },
    subscriptionId: { S: options.subscriptionId },
    boundaryId: { S: options.boundaryId },
    functionId: { S: options.functionId },
    schedule: options.schedule ? { S: JSON.stringify(options.schedule) } : undefined,
  };
}

// Utility function to appropriately type
function to_dynamo(value) {
  if (typeof value == 'number') {
    return { N: `${value}` };
  }
  if (typeof value == 'boolean') {
    return { BOOL: value };
  }
  if (typeof value == 'string') {
    return { S: value };
  }
  if (typeof value == 'object' && value == null) {
    return { NULL: true };
  }
}
