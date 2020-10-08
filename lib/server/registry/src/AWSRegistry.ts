import AWS from 'aws-sdk';

import * as Constants from '@5qtrs/constants';

import { IRegistryConfig, IRegistryStore } from './Registry';

const CATEGORY_REGISTRY = 'registry-npm-package';
const CATEGORY_REGISTRY_CONFIG = 'registry-npm-config';

const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
  httpOptions: {
    timeout: 5000,
  },
  maxRetries: 3,
});

const s3Path = '/registry/npm';
const tableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string);

type ExpressHandler = (reqExpress: Request, res: Response, next: any) => any;

class AWSRegistry implements IRegistryStore {
  public static handler(): ExpressHandler {
    return (reqExpress: Request, res: Response, next: any) => {
      const req: any = reqExpress;
      req.registry = new AWSRegistry(
        [req.params.accountId, req.params.subscriptionId, req.params.registryId].join('/')
      );
      return next();
    };
  }

  private keyPrefix: string;
  constructor(prefix: string) {
    this.keyPrefix = prefix;
  }

  public async put(key: string, pkg: any, payload: any): Promise<void> {
    // Upload file
    await s3
      .upload({
        Bucket: process.env.AWS_S3_BUCKET as string,
        Key: [this.keyPrefix, s3Path, key].join('/'),
        Body: payload,
      })
      .promise();

    // Add record to dynamodb.
    await ddb
      .putItem({
        TableName: tableName,
        Item: {
          category: { S: CATEGORY_REGISTRY },
          key: { S: [this.keyPrefix, key].join('/') },
          pkg: { S: JSON.stringify(pkg) },
          name: { S: pkg.name },
        },
      })
      .promise();
  }

  public async get(key: any): Promise<any> {
    // Retrieve record from DynamoDB
    const params = {
      TableName: tableName,
      Key: {
        category: { S: CATEGORY_REGISTRY },
        key: { S: [this.keyPrefix, key].join('/') },
      },
    };

    const result = await ddb.getItem(params).promise();
    return result && result.Item && result.Item.pkg ? JSON.parse(result.Item.pkg.S as string) : undefined;
  }

  // Presumes the key has already been modified with the subscription/registry warts.
  public async tarball(key: any): Promise<string> {
    // Retrieve file from S3

    const signedUrlExpireSeconds = 60 * 5;

    const url = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: [this.keyPrefix, s3Path, key].join('/'),
      Expires: signedUrlExpireSeconds,
    });

    return url;
  }

  public async search(keyword: string, count: number = 100, next?: string): Promise<any> {
    // Build the request
    const params = {
      TableName: tableName,
      ProjectionExpression: 'category, #k, pkg',
      ExpressionAttributeNames: { '#k': 'key', '#n': 'name' },
      ExpressionAttributeValues: {
        ':searchCategory': { S: CATEGORY_REGISTRY },
        ':sortKeyPrefix': { S: this.keyPrefix },
        ':searchKey': { S: keyword },
      },
      KeyConditionExpression: `category = :searchCategory AND begins_with(#k, :sortKeyPrefix)`,
      // Filter based on the criteria supplied
      FilterExpression: 'contains(#n, :searchKey)',
      ExclusiveStartKey: next
        ? JSON.parse(Buffer.from(decodeURIComponent(next), 'base64').toString('utf8'))
        : undefined,
    };
    const result = await ddb.query(params).promise();
    const items = result.Items || [];

    return {
      objects: items.map((o: any) => ({ package: JSON.parse(o.pkg.S) })),
      total: items.length,
      time: new Date().toUTCString(),
    };
  }

  public async configPut(config: IRegistryConfig): Promise<void> {
    // Add record to dynamodb.
    await ddb
      .putItem({
        TableName: tableName,
        Item: {
          category: { S: CATEGORY_REGISTRY_CONFIG },
          key: { S: this.keyPrefix },
          config: { S: JSON.stringify(config) },
        },
      })
      .promise();
  }

  public async configGet(): Promise<IRegistryConfig> {
    // Retrieve record from DynamoDB
    const result = await ddb
      .getItem({
        TableName: tableName,
        Key: {
          category: { S: CATEGORY_REGISTRY_CONFIG },
          key: { S: this.keyPrefix },
        },
      })
      .promise();

    return result && result.Item && result.Item.config ? JSON.parse(result.Item.config.S as string) : { scopes: [] };
  }
}

export { AWSRegistry };
