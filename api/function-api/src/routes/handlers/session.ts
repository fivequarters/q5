import AWS from 'aws-sdk';
import { Request, Response, NextFunction } from 'express';
import create_error from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import * as Constants from '@5qtrs/constants';

const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
  httpOptions: {
    timeout: 5000,
  },
  maxRetries: 3,
});

const CATEGORY_SESSION = 'session-storage';
const getSessionTtl = () => `${180 + Date.now() / 1000}`;

const KeyValueTable = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string);

const getSessionDbKey = (req: Request, key: string) => {
  return [
    `/account/${req.params.accountId}`,
    `/subscription/${req.params.subscriptionId}`,
    `/${req.params.componentType}/${req.params.componentId}`,
    `/session/${key}`,
  ].join('');
};

const create = async (req: Request, res: Response, next: NextFunction) => {
  // Place the entire contents of the session object in DynamoDB.
  const sessionId = uuidv4();
  try {
    await putSession(req, sessionId);
  } catch (e) {
    return next(e);
  }

  res.json({ session: sessionId }).send();
};

const put = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await putSession(req, req.params.sessionId);
  } catch (e) {
    return next(e);
  }

  res.json({ session: req.params.sessionId }).send();
};

const putSession = async (req: Request, sessionId: string) => {
  const params = {
    TableName: KeyValueTable,
    Item: {
      category: { S: CATEGORY_SESSION },
      key: { S: getSessionDbKey(req, sessionId) },
      ttl: { N: getSessionTtl() },
      data: { S: JSON.stringify(req.body) },
    },
  };

  await ddb.putItem(params).promise();
};

const get = async (req: Request, res: Response, next: NextFunction) => {
  const params = {
    TableName: KeyValueTable,
    Key: {
      category: { S: CATEGORY_SESSION },
      key: { S: getSessionDbKey(req, req.params.sessionId) },
    },
  };

  let result;
  try {
    result = await ddb.getItem(params).promise();
  } catch (e) {
    next(e);
  }

  if (!(result && result.Item && result.Item.data && result.Item.data.S)) {
    return next(create_error(404));
  }

  return res.json(JSON.parse(result.Item.data.S)).send();
};

export { get, create, put };
