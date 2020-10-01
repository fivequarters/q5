import AWS from 'aws-sdk';

import * as Constants from '@5qtrs/constants';

import { IRegistryStore } from './Registry';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const ddb = new AWS.DynamoDB({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
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
          category: { S: 'registry-npm-package' },
          key: { S: [this.keyPrefix, key].join('/') },
          pkg: { S: pkg },
        },
      })
      .promise();
  }

  public async get(key: any): Promise<any> {
    // Retrieve record from DynamoDB
    const params = {
      TableName: tableName,
      Item: {
        category: { S: 'registry-npm-package' },
        key: { S: [this.keyPrefix, key].join('/') },
      },
    };
    await ddb.putItem(params).promise();
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

  public async search(keywords: string[]): Promise<any> {
    return {};
  }
}

export { AWSRegistry };
