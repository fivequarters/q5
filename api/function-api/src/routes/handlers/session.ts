import AWS from 'aws-sdk';
import { Request, Response, NextFunction } from 'express';
import create_error from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import * as Constants from '@5qtrs/constants';

interface ISessionKeyParams {
  accountId: string;
  subscriptionId: string;
  componentType: string;
  componentId: string;
  sessionId: string;
}

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

const getSessionDbKey = (params: ISessionKeyParams): string => {
  return [
    `/account/${params.accountId}`,
    `/subscription/${params.subscriptionId}`,
    `/${params.componentType}/${params.componentId}`,
    `/session/${params.sessionId}`,
  ].join('');
};

const putSession = async (params: ISessionKeyParams, payload: any) => {
  const ddbParams = {
    TableName: KeyValueTable,
    Item: {
      category: { S: CATEGORY_SESSION },
      key: { S: getSessionDbKey(params) },
      ttl: { N: getSessionTtl() },
      data: { S: JSON.stringify(payload) },
    },
  };

  await ddb.putItem(ddbParams).promise();
};

const getSession = async (params: ISessionKeyParams) => {
  const ddbParams = {
    TableName: KeyValueTable,
    Key: {
      category: { S: CATEGORY_SESSION },
      key: { S: getSessionDbKey(params) },
    },
  };

  let result;
  result = await ddb.getItem(ddbParams).promise();

  if (!(result && result.Item && result.Item.data && result.Item.data.S)) {
    return undefined;
  }

  return JSON.parse(result.Item.data.S);
};

const create = async (req: Request, res: Response, next: NextFunction) => {
  // Place the entire contents of the session object in DynamoDB.
  const sessionId = uuidv4();
  try {
    await putSession(
      {
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        componentType: req.params.componentType,
        componentId: req.params.componentId,
        sessionId,
      },
      req.body
    );
  } catch (e) {
    return next(e);
  }

  res.json({ sessionId }).send();
};

const put = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await putSession(
      {
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        componentType: req.params.componentType,
        componentId: req.params.componentId,
        sessionId: req.params.sessionId,
      },
      req.body
    );
  } catch (e) {
    return next(e);
  }

  res.json({ sessionId: req.params.sessionId }).send();
};

const get = async (req: Request, res: Response, next: NextFunction) => {
  let result;
  try {
    result = getSession({
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      componentType: req.params.componentType,
      componentId: req.params.componentId,
      sessionId: req.params.sessionId,
    });
  } catch (e) {
    return next(e);
  }
  if (!result) {
    return next(create_error(404));
  }
  return res.json(result).send();
};

export { get, create, put, ISessionKeyParams, getSession, putSession };
