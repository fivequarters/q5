const create_error = require('http-errors');

const Constants = require('@5qtrs/constants');

const { get_func_search_key, keyValueTableName, TAG_CATEGORY_FUNCTION } = require('./constants');
const { dynamo, to_dynamo } = require('./dynamo');

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
      ProjectionExpression: 'category, #k, boundaryId, functionId, schedule',
      Limit: limit ? limit : 100,
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
    return cb(
      null,
      d.Items.map((i) => {
        try {
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
          };
        } catch (e) {
          // Defensive, in case the JSON in schedule isn't parsable.
          return {
            boundaryId: i.boundaryId.S,
            functionId: i.functionId.S,
            location: Constants.get_function_location(
              options.req,
              options.subscriptionId,
              i.boundaryId.S,
              i.functionId.S
            ),
          };
        }
      }),
      d.LastEvaluatedKey
        ? encodeURIComponent(Buffer.from(JSON.stringify(d.LastEvaluatedKey)).toString('base64'))
        : undefined
    );
  });
}
