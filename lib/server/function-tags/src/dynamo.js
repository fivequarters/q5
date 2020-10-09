const { DynamoDB } = require('aws-sdk');

const { TAG_CATEGORY_FUNCTION, keyValueTableName, get_func_sort_key, convert_spec_to_tags } = require('./constants');

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

// Repeatedly write the contents of request until all of the items have been acknowledged by DynamoDB.
export function execute_dynamo_batch_write(options, items, cb, backoff = 0) {
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
          return execute_dynamo_batch_write(options, d.UnprocessedItems[keyValueTableName], cb, backoff + 1);
        } else if (Object.keys(overflow).length > 0) {
          // Not a failure, so don't bump backoff - send any of the overflow entries that got trimmed.
          return execute_dynamo_batch_write(options, overflow, cb, backoff);
        }

        // All items successfully written.
        return cb();
      });
    },
    backoff > 0 ? expBackoff(backoff) : 0
  );
}

// Convert a key:value pair into a delete request for DynamoDB.
export function get_dynamo_delete_request(options) {
  return [
    {
      DeleteRequest: {
        Key: {
          category: { S: TAG_CATEGORY_FUNCTION },
          key: { S: get_func_sort_key(options) },
        },
      },
    },
  ];
}

export function get_dynamo_create_request(options, spec) {
  const tags = convert_spec_to_tags(spec);
  const promoted = get_dynamo_promoted_attributes(options);

  return [
    {
      PutRequest: {
        Item: {
          // Add in each tag
          ...Object.entries(tags).reduce((o, e) => {
            o[e[0]] = to_dynamo(e[1]);
            return o;
          }, {}),
          // Add in the variables we want to search from
          ...promoted,
          category: { S: TAG_CATEGORY_FUNCTION },
          key: {
            S: get_func_sort_key(options),
          },
        },
      },
    },
  ];
}

// Some elements of options get promoted into columns in the entries for future filter operations.
function get_dynamo_promoted_attributes(options) {
  return {
    accountId: { S: options.accountId },
    subscriptionId: { S: options.subscriptionId },
    boundaryId: { S: options.boundaryId },
    functionId: { S: options.functionId },
    schedule: options.schedule ? { S: JSON.stringify(options.schedule) } : undefined,
  };
}

// Utility function to appropriately type
export function to_dynamo(value) {
  if (typeof value == 'number') {
    return { N: `${value}` };
  }
  if (typeof value == 'boolean') {
    return { BOOL: value };
  }
  if (typeof value == 'string') {
    // Guess a handful of types, mostly for search parameters.
    if (value === 'true' || value === 'false') {
      return { BOOL: value === 'true' };
    }

    if (value === 'null') {
      return { NULL: true };
    }

    if (!isNaN(Number(value))) {
      return { N: value };
    }

    return { S: value };
  }
  if (typeof value == 'object' && value == null) {
    return { NULL: true };
  }
}
