interface IProxyRequest {
  action: 'S3.PutObject' | 'S3.DeleteObject' | 'STS.GetCallerIdentity' | 'STS.AssumeRole';
  body?: string;
  externalId?: string;
  roleArn?: string;
  durationSeconds?: number;
  sessionId?: string;
}

interface IAwsProxyService {
  proxyRequest: (payload: any) => string;
}

interface IAwsProxyConfiguration {
  accountId: string;
  subscriptionId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  bucketPrefix: string;
}
