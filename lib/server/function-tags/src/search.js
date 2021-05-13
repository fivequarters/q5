const create_error = require('http-errors');

const Constants = require('@5qtrs/constants');

const { get_func_search_key, get_func_sort_key, keyValueTableName, TAG_CATEGORY_FUNCTION } = require('./constants');
const { dynamo, to_dynamo, from_dynamo } = require('./dynamo');

export function search_function_tags(options, criteria, next, limit, cb) {
  let continuationToken;

  let params;

  try {
    // Create a mapping that's easy for Dynamo to consume.
    const critEntries = Object.entries(criteria);

    // Create the mapping objects for the query
    const critKeys = critEntries.reduce((o, e, i) => {
      o[`#crit_k${i}`] = e[0];
      return o;
    }, {});
    const critValues = critEntries.reduce((o, e, i) => {
      o[`:crit_v${i}`] = to_dynamo(e[1]);
      return o;
    }, {});
    const critRules = critEntries.reduce((o, e, i) => {
      const critTest = e[1] !== undefined ? `#crit_k${i} = :crit_v${i}` : `attribute_exists(#crit_k${i})`;
      // Everything is just ANDed together for now
      return o + (i > 0 ? ' AND ' : '') + critTest;
    }, '');

    // Build the request
    params = {
      TableName: keyValueTableName,
      ProjectionExpression: options.includeTags ? undefined : 'category, #k, boundaryId, functionId, schedule',
      Limit: limit ? limit : 100,
      ConsistentRead: true,
      ExpressionAttributeNames: { '#k': 'key', ...critKeys },
      ExpressionAttributeValues: {
        ':searchCategory': { S: TAG_CATEGORY_FUNCTION },
        ':sortKeyPrefix': { S: get_func_search_key(options) },
        ...critValues,
      },
      KeyConditionExpression: `category = :searchCategory AND begins_with(#k, :sortKeyPrefix)`,
      // Filter based on the criteria supplied
      FilterExpression: critRules.length > 0 ? critRules : undefined,
      ExclusiveStartKey: next
        ? JSON.parse(Buffer.from(decodeURIComponent(next), 'base64').toString('utf8'))
        : undefined,
    };
  } catch (e) {
    return cb(create_error(400, "invalid 'next' parameter"));
  }

  (options.dynamo || dynamo).query(params, (e, d) => {
    if (e) {
      return cb(e);
    }
    const get_tags = (i) => {
      const tags = {};
      for (const [key, entry] of Object.entries(i)) {
        if (key === 'cron' || key.indexOf('.') > 0) {
          const v = from_dynamo(entry);
          if (v !== undefined) {
            tags[key] = v;
          }
        }
      }
      return tags;
    };
    return cb(
      null,
      d.Items.map((i) => {
        return {
          boundaryId: i.boundaryId.S,
          functionId: i.functionId.S,
          schedule: i.schedule ? JSON.parse(i.schedule.S) : undefined,
          location: Constants.get_function_location(
            options.req,
            options.subscriptionId,
            i.boundaryId.S,
            i.functionId.S
          ),
          ...(options.includeTags ? { runtime: { tags: get_tags(i) } } : {}),
        };
      }),
      d.LastEvaluatedKey
        ? encodeURIComponent(Buffer.from(JSON.stringify(d.LastEvaluatedKey)).toString('base64'))
        : undefined
    );
  });
}

export function get_function_tags(options, cb) {
  // Build the request
  const params = {
    TableName: keyValueTableName,
    Key: {
      category: { S: TAG_CATEGORY_FUNCTION },
      key: { S: get_func_sort_key(options) },
    },
  };

  (options.dynamo || dynamo).getItem(params, (e, d) => {
    if (e) {
      return cb(e);
    }

    // Convert out of Dynamo and into a flat object.
    const result = {};

    if (!d.Item) {
      return cb(create_error(404));
    }

    for (const [key, entry] of Object.entries(d.Item)) {
      const v = from_dynamo(entry);
      if (v !== undefined) {
        result[key] = v;
      }
    }

    return cb(null, result);
  });
}
