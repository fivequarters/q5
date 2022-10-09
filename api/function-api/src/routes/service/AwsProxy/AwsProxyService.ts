import { STS, S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export interface IProxyRequest {
  action: 'S3.PutObject' | 'S3.DeleteObject' | 'STS.GetCallerIdentity' | 'STS.AssumeRole';

  requestBody: any;
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

    let response: STS.AssumeRoleResponse | STS.GetCallerIdentityResponse | undefined = undefined;

    switch (action) {
      case 'S3.PutObject': {
        // We do not need any response from this action
        await s3Sdk
          .putObject({
            Bucket: this.proxyConfiguration.bucketName,
            Key: `${this.proxyConfiguration.bucketPrefix}/${request.requestBody.sessionId}`,
            Body: Buffer.from(request.requestBody.body),
            ContentType: 'text/plain',
          })
          .promise();
        break;
      }

      case 'S3.DeleteObject': {
        await s3Sdk
          .deleteObject({
            Bucket: this.proxyConfiguration.bucketName,
            Key: `${this.proxyConfiguration.bucketPrefix}/${request.requestBody.sessionId}`,
          })
          .promise();
        break;
      }

      case 'STS.GetCallerIdentity': {
        response = await stsSdk.getCallerIdentity().promise();
        break;
      }

      case 'STS.AssumeRole': {
        response = await stsSdk
          .assumeRole({
            ExternalId: request.requestBody.externalId,
            RoleSessionName: uuidv4(),
            RoleArn: request.requestBody.roleArn,
            DurationSeconds: request.requestBody.durationSeconds,
          })
          .promise();

        // No need to pass any of this back
        delete response.AssumedRoleUser;
        delete response.PackedPolicySize;
        delete response.SourceIdentity;
        break;
      }
    }

    return response || { status: 'ok' };
  }
}
