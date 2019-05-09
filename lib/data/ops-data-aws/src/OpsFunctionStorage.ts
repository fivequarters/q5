import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
const Async = require('async');

export async function createFunctionStorage(config: OpsDataAwsConfig, awsConfig: IAwsConfig) {
  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

  const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  });

  return new Promise((resolve, reject) => {
    return Async.series(
      [
        (cb: any) => ensureS3Bucket(cb),
        (cb: any) => configureBucketEncryption(cb),
        (cb: any) => configurePublicAccess(cb),
        (cb: any) => configureLifecycle(cb),
      ],
      (e: any) => {
        return e ? reject(e) : resolve();
      }
    );
  });

  function ensureS3Bucket(cb: any) {
    let params = {
      Bucket: config.getS3Bucket(awsConfig),
      CreateBucketConfiguration: {
        LocationConstraint: awsConfig.region,
      },
    };
    s3.createBucket(params, (e, d) => {
      if (e) {
        if (e.code === 'BucketAlreadyOwnedByYou') {
          return cb();
        }
        return cb(e);
      }
      cb();
    });
  }

  function configureBucketEncryption(cb: any) {
    let params = {
      Bucket: config.getS3Bucket(awsConfig),
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    };
    s3.putBucketEncryption(params, (e, d) => cb(e));
  }

  function configurePublicAccess(cb: any) {
    let params = {
      Bucket: config.getS3Bucket(awsConfig),
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    };
    s3.putPublicAccessBlock(params, (e, d) => cb(e));
  }

  function configureLifecycle(cb: any) {
    let params = {
      Bucket: config.getS3Bucket(awsConfig),
      LifecycleConfiguration: {
        Rules: [
          {
            ID: 'expire-function-build-status',
            Status: 'Enabled',
            Expiration: {
              Days: 1,
            },
            Filter: {
              Prefix: 'function-build-status/',
            },
          },
          {
            ID: 'expire-function-build-request',
            Status: 'Enabled',
            Expiration: {
              Days: 1,
            },
            Filter: {
              Prefix: 'function-build-request/',
            },
          },
        ],
      },
    };
    s3.putBucketLifecycleConfiguration(params, (e, d) => cb(e));
  }
}
