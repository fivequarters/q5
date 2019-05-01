import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { IAwsRolePolicy } from '@5qtrs/aws-role';
import { batch } from '@5qtrs/batch';
import { S3 } from 'aws-sdk';
import { basename } from 'path';

// ------------------
// Internal Constants
// ------------------

const delimiter = '.';
const locationContraints = [
  'eu-west-1',
  'us-west-1',
  'us-west-2',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'sa-east-1',
  'cn-north-1',
  'eu-central-1',
];

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsS3BucketOptions {
  publicRead?: boolean;
}

export interface IAwsS3ObjectOptions {
  publicRead?: boolean;
  cacheControl?: string;
  encryptAtRest?: boolean;
  overwrite?: boolean;
}

export interface IAwsS3BucketPolicyOptions {
  readOnly?: boolean;
}

export interface IAwsS3ObjectPolicyOptions {
  readOnly?: boolean;
}

// ----------------
// Exported Classes
// ----------------

export class AwsS3 extends AwsBase<typeof S3> {
  public static async create(config: IAwsConfig) {
    return new AwsS3(config);
  }
  private constructor(config: IAwsConfig) {
    super(config, delimiter);
  }

  public getBucketPolicy(name: string, options?: IAwsS3BucketPolicyOptions): IAwsRolePolicy {
    const actions = ['s3:ListBucket'];
    const readOnly = options && options.readOnly !== undefined ? options.readOnly : true;
    if (!readOnly) {
      actions.push('s3:CreateBucket');
      actions.push('s3:DeleteBucket');
    }
    return {
      actions,
      resource: `arn:aws:s3:::${this.getFullName(name)}`,
    };
  }

  public getObjectPolicy(bucketName: string, key: string, options?: IAwsS3ObjectPolicyOptions): IAwsRolePolicy {
    const actions = ['s3:GetObject'];
    const readOnly = options && options.readOnly !== undefined ? options.readOnly : true;
    if (!readOnly) {
      actions.push('s3:PutObject');
      actions.push('s3:DeleteObject');
    }
    return {
      actions,
      resource: `arn:aws:s3:::${this.getFullName(bucketName)}/${key}`,
    };
  }

  public async listBuckets(): Promise<string[]> {
    const s3 = await this.getAws();
    return new Promise((resolve, reject) => {
      s3.listBuckets((error: Error, data: any) => {
        if (error) {
          return reject(error);
        }

        const result: string[] = [];
        const keyPrefix = this.getFullName('');
        if (data && data.Buckets) {
          for (const bucket of data.Buckets) {
            const name = bucket.Name;
            if (name.indexOf(keyPrefix) === 0) {
              result.push(name.substr(keyPrefix.length));
            }
          }
        }
        resolve(result);
      });
    });
  }

  public async ensureBucket(name: string, options?: IAwsS3BucketOptions): Promise<string> {
    const s3 = await this.getAws();
    const bucketName = this.getFullName(name);
    const publicRead = options && options.publicRead !== undefined ? options.publicRead : false;
    const params: any = {
      Bucket: bucketName,
      ACL: publicRead ? 'public-read' : 'private',
    };
    const locationContraint = this.getLocationConstraint(this.awsRegion);
    if (locationContraint) {
      params.CreateBucketConfiguration = { LocationConstraint: locationContraint };
    }

    return new Promise((resolve, reject) => {
      s3.createBucket(params, (error: any, data: any) => {
        if (error && error.code !== 'BucketAlreadyOwnedByYou') {
          return reject(error);
        }

        const params2 = { Bucket: bucketName };
        s3.waitFor('bucketExists', params2, (error2: any) => {
          if (error2) {
            return reject(error2);
          }

          resolve(bucketName);
        });
      });
    });
  }

  public async deleteBucket(name: string): Promise<void> {
    const s3 = await this.getAws();
    const bucketName = this.getFullName(name);
    const params: any = {
      Bucket: bucketName,
    };

    return new Promise((resolve, reject) => {
      s3.deleteBucket(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const params2 = { Bucket: bucketName };
        s3.waitFor('bucketNotExists', params2, (error2: any) => {
          if (error2) {
            return reject(error2);
          }

          resolve();
        });
      });
    });
  }

  public async emptyBucket(name: string): Promise<void> {
    const keys = await this.listObjectKeys(name);
    const batchedKeys = batch(10, keys);
    for (const keyBatch of batchedKeys) {
      await Promise.all(keyBatch.map(key => this.deleteObject(name, key)));
    }
  }

  public async bucketExists(name: string): Promise<boolean> {
    const s3 = await this.getAws();
    const bucketName = this.getFullName(name);
    const params = { Bucket: bucketName };
    return new Promise((resolve, reject) => {
      s3.headBucket(params, (error: any, data: any) => {
        if (error) {
          if (error.statusCode === 404) {
            return resolve(false);
          }
          return reject(error);
        }

        resolve(true);
      });
    });
  }

  public async objectExists(name: string, key: string): Promise<boolean> {
    const s3 = await this.getAws();
    const bucketName = this.getFullName(name);
    const params = { Bucket: bucketName, Key: key };

    return new Promise((resolve, reject) => {
      s3.headObject(params, (error: any, data: any) => {
        if (error) {
          if (error.statusCode === 404) {
            return resolve(false);
          }
          return reject(error);
        }

        resolve(true);
      });
    });
  }

  public async listObjectKeys(bucketName: string, keyPrefix?: string): Promise<string[]> {
    const s3 = await this.getAws();
    const fullBucketName = this.getFullName(bucketName);
    const params: any = {
      Bucket: fullBucketName,
    };
    if (keyPrefix) {
      params.Prefix = keyPrefix;
    }

    return new Promise((resolve, reject) => {
      const result: string[] = [];

      const func = () => {
        s3.listObjects(params, (error: any, data: any) => {
          if (error) {
            return reject(error);
          }

          if (data) {
            if (data.Contents) {
              for (const entry of data.Contents) {
                result.push(entry.Key);
              }
            }
            if (data.NextContinuationToken) {
              params.ContinuationToken = data.NextContinuationToken;
              return func();
            }
          }
          resolve(result);
        });
      };

      func();
    });
  }

  public async getObject(bucketName: string, key: string): Promise<Buffer> {
    const s3 = await this.getAws();
    const fullBucketName = this.getFullName(bucketName);
    const params = {
      Bucket: fullBucketName,
      Key: key,
    };

    return new Promise((resolve, reject) => {
      s3.getObject(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const body = data && data.Body ? data.Body : Buffer.from([]);
        resolve(body);
      });
    });
  }

  public async uploadObject(
    bucketName: string,
    key: string,
    content: string | Buffer,
    options?: IAwsS3ObjectOptions
  ): Promise<boolean> {
    if (options && options.overwrite === false) {
      if (await this.objectExists(bucketName, key)) {
        return false;
      }
    }

    const s3 = await this.getAws();
    const fullBucketName = this.getFullName(bucketName);
    const publicRead = options && options.publicRead !== undefined ? options.publicRead : false;
    const params: any = {
      Bucket: fullBucketName,
      Key: key,
      Body: content,
      ACL: publicRead ? 'public-read' : 'private',
    };

    const cacheControl = options && options.cacheControl !== undefined ? options.cacheControl : undefined;
    if (cacheControl) {
      params.CacheControl = cacheControl;
    }

    const encryptAtRest = options && options.encryptAtRest !== undefined ? options.encryptAtRest : false;
    if (encryptAtRest) {
      params.ServerSideEncryption = 'aws:kms';
    }

    return new Promise((resolve, reject) => {
      s3.putObject(params, (error: any) => {
        if (error) {
          return reject(error);
        }

        const params2 = { Bucket: fullBucketName, Key: key };
        s3.waitFor('objectExists', params2, (error2: any) => {
          if (error2) {
            return reject(error2);
          }

          resolve(true);
        });
      });
    });
  }

  public async deleteObject(bucketName: string, key: string): Promise<void> {
    const s3 = await this.getAws();
    const fullBucketName = this.getFullName(bucketName);
    const params = {
      Bucket: fullBucketName,
      Key: key,
    };

    return new Promise((resolve, reject) => {
      s3.deleteObject(params, (error: any) => {
        if (error) {
          return reject(error);
        }

        s3.waitFor('objectNotExists', params, (error2: any) => {
          if (error2) {
            return reject(error2);
          }

          resolve();
        });
      });
    });
  }

  protected getFullPrefix() {
    return `${this.awsRegion}${delimiter}${super.getFullPrefix()}`;
  }

  protected onGetAws(config: IAwsConfig) {
    return new S3(config);
  }

  private getLocationConstraint(regionCode: string) {
    return locationContraints.indexOf(regionCode) >= 0 ? regionCode : undefined;
  }
}
