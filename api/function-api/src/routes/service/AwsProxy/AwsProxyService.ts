import { STS, S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const S3_BASE_URL = 's3.amazonaws.com';

export interface IProxyRequest {
  action: 'S3.PutObject' | 'S3.DeleteObject' | 'STS.GetCallerIdentity' | 'STS.AssumeRole';
  body?: string;
  externalId?: string;
  roleArn?: string;
  durationSeconds?: number;
  sessionId?: string;
}

export interface IAwsProxyService {
  proxyRequest: (payload: any) => string;
}

export interface IAwsProxyConfiguration {
  accountId: string;
  subscriptionId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  bucketPrefix: string;
}

export class AwsProxyService {
  constructor(public proxyConfiguration: IAwsProxyConfiguration) {}

  public async handleRequest(request: IProxyRequest) {
    const stsSdk = new STS({
      accessKeyId: this.proxyConfiguration.accessKeyId,
      secretAccessKey: this.proxyConfiguration.secretAccessKey,
    });

    const s3Sdk = new S3({
      accessKeyId: this.proxyConfiguration.accessKeyId,
      secretAccessKey: this.proxyConfiguration.secretAccessKey,
    });

    const action = request.action;

    let response:
      | { accountId: string }
      | { accessKeyId: string; secretAccessKey: string; sessionToken: string; expiration: number }
      | { s3Url: string }
      | undefined = undefined;

    switch (action) {
      case 'S3.PutObject': {
        // We do not need any response from this action
        await s3Sdk
          .putObject({
            Bucket: this.proxyConfiguration.bucketName,
            Key: `${this.proxyConfiguration.bucketPrefix}/${request.sessionId}`,
            Body: Buffer.from(request.body as string),
            ContentType: 'text/plain',
          })
          .promise();
        response = {
          s3Url: `https://${S3_BASE_URL}/${this.proxyConfiguration.bucketName}/${this.proxyConfiguration.bucketPrefix}/${request.sessionId}`,
        };
        break;
      }

      case 'S3.DeleteObject': {
        await s3Sdk
          .deleteObject({
            Bucket: this.proxyConfiguration.bucketName,
            Key: `${this.proxyConfiguration.bucketPrefix}/${request.sessionId}`,
          })
          .promise();
        break;
      }

      case 'STS.GetCallerIdentity': {
        const tempResponse = await stsSdk.getCallerIdentity().promise();
        response = { accountId: tempResponse.Account as string };
        break;
      }

      case 'STS.AssumeRole': {
        const tempResponse = await stsSdk
          .assumeRole({
            ExternalId: request.externalId as string,
            RoleSessionName: uuidv4(),
            RoleArn: request.roleArn as string,
            DurationSeconds: request.durationSeconds,
          })
          .promise();
        const accessCreds = tempResponse.Credentials;
        response = {
          accessKeyId: accessCreds?.AccessKeyId as string,
          secretAccessKey: accessCreds?.SecretAccessKey as string,
          expiration: accessCreds?.Expiration.getTime() as number,
          sessionToken: accessCreds?.SessionToken as string,
        };
        break;
      }
    }

    return response || { status: 'ok' };
  }
}
