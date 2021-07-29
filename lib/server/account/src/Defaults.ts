import { DynamoDB } from 'aws-sdk';
import * as Constants from '@5qtrs/constants';

let DeploymentName = process.env.DEPLOYMENT_KEY as string;

export const Keys = [{ key: Constants.DEFAULTS_SUBSCRIPTION, name: 'Subscription' }];

export const setDeploymentName = (deploymentName: string) => (DeploymentName = deploymentName);

export const set = async (dynamo: DynamoDB, key: string, value: any) => {
  const tableName = Constants.get_key_value_table_name(DeploymentName);
  const params = {
    TableName: tableName,
    Key: {
      category: { S: Constants.DEFAULTS_CATEGORY },
      key: { S: key },
    },
  };

  const results = await dynamo.getItem(params).promise();
  results.Item = { ...params.Key, ...results.Item };
  const defaults = Constants.mergeDeep(JSON.parse(results.Item?.value?.S || '{}'), value);
  results.Item.value = { S: JSON.stringify(defaults) };

  return dynamo
    .putItem({
      TableName: tableName,
      Item: results.Item,
    })
    .promise();
};

export const get = async (dynamo: DynamoDB, key: string) => {
  const params = {
    TableName: Constants.get_key_value_table_name(DeploymentName),
    Key: {
      category: { S: Constants.DEFAULTS_CATEGORY },
      key: { S: key },
    },
  };

  const results = await dynamo.getItem(params).promise();

  const defaults = JSON.parse(results.Item?.value?.S || '{}');
  return defaults;
};

export const unset = async (dynamo: DynamoDB, key: string, dotKey: string) => {
  const tableName = Constants.get_key_value_table_name(DeploymentName);
  const params = {
    TableName: tableName,
    Key: {
      category: { S: Constants.DEFAULTS_CATEGORY },
      key: { S: key },
    },
  };

  const results = await dynamo.getItem(params).promise();
  results.Item = { ...params.Key, ...results.Item };

  const value = JSON.parse(results.Item?.value?.S || '{}');

  // Remove the leaf entry in the list.
  const parentObj = dotKey
    .split('.')
    .slice(0, -1)
    .reduce((obj, i) => obj[i], value);
  delete parentObj[dotKey.split('.').pop() as string];

  results.Item.value = { S: JSON.stringify(value) };

  return dynamo
    .putItem({
      TableName: tableName,
      Item: results.Item,
    })
    .promise();
};
