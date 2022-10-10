import { STS, S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export interface IProxyRequest extends Record<string, any> {
  action: 'S3.PutObject' | 'S3.DeleteObject' | 'STS.GetCallerIdentity' | 'STS.AssumeRole';
}

export interface IAwsProxyService {
  proxyRequest: (payload: any) => string;
}

export interface IAwsProxyConfiguration extends Record<string, string> {
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
      | { accessKeyId: string; secretAccessKey: string; sessionToken: string; expiration: string }
      | undefined = undefined;

    switch (action) {
      case 'S3.PutObject': {
        // We do not need any response from this action
        await s3Sdk
          .putObject({
            Bucket: this.proxyConfiguration.bucketName,
            Key: `${this.proxyConfiguration.bucketPrefix}/${request.sessionId}`,
            Body: Buffer.from(request.body),
            ContentType: 'text/plain',
          })
          .promise();
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
            ExternalId: request.externalId,
            RoleSessionName: uuidv4(),
            RoleArn: request.roleArn,
            DurationSeconds: request.durationSeconds,
          })
          .promise();
        const accessCreds = tempResponse.Credentials;
        response = {
          accessKeyId: accessCreds?.AccessKeyId as string,
          secretAccessKey: accessCreds?.SecretAccessKey as string,
          expiration: accessCreds?.Expiration.toTimeString() as string,
          sessionToken: accessCreds?.SessionToken as string,
        };
        break;
      }
    }

    return response || { status: 'ok' };
  }
}
