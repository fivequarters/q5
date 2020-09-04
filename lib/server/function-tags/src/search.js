const create_error = require('http-errors');

const Constants = require('@5qtrs/constants');

const { get_func_search_key, TAG_CATEGORY_FUNCTION } = './constants';
const { dynamo } = './dynamo';

export function search_function_tags(options, criteria, next, limit, cb) {
  let continuationToken;

  let params;

  try {
    params = {
      TableName: keyValueTableName,
      ProjectionExpression: 'category, #k, boundaryId, functionId, schedule',
      Limit: limit ? limit : 100,
      ExpressionAttributeNames: { '#k': 'key' },
      ExpressionAttributeValues: {
        ':searchCategory': { S: TAG_CATEGORY_FUNCTION },
        ':sortKeyPrefix': { S: get_func_search_key(options, key, value) },
      },
      KeyConditionExpression: `category = :searchCategory AND begins_with(#k, :sortKeyPrefix)`,
      FilterExpression: '' /* XXX magic */,
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
