import { STS, S3 } from 'aws-sdk';

const SERVICE_NAME = 'aws';

export interface IProxyRequest {
  action: 'S3.PutObject' | 'S3.DeleteObject' | 'STS.AssumeRole';

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

    let response: any;

    switch (action) {
      case 'S3.PutObject': {
        response = await s3Sdk.putObject({ ...request.requestBody }).promise();
      }

      case 'S3.DeleteObject': {
        response = await s3Sdk.deleteObject({ ...request.requestBody }).promise();
      }

      case 'STS.AssumeRole': {
        response = await stsSdk.assumeRole({ ...request.requestBody }).promise();
      }
      default: {
        response = { invalid_action: 'true' };
      }
    }

    return response;
  }
}
