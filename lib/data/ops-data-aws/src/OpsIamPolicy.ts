import * as AWS from 'aws-sdk';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { debug } from './OpsDebug';

export async function createPolicy(
  awsConfig: IAwsConfig,
  policyName: string,
  policyDocument: object,
  description: string,
  permissionsBoundary?: string
) {
  debug('IN CREATE POLICY');

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    apiVersion: '2010-05-08',
  };

  const iam = new AWS.IAM(options);

  try {
    // Create the policy
    const params = {
      PolicyName: policyName,
      PolicyDocument: JSON.stringify(policyDocument),
      Description: description,
    };
    const policy = await iam.createPolicy(params).promise();
    if (!policy.Policy) {
      throw new Error('Policy failed to be created');
    }

    // Wait for the policy to become available within IAM
    await iam.waitFor('policyExists', { PolicyArn: policy.Policy.Arn as string }).promise();

    debug(`Policy ${policy.Policy.Arn} created`);
  } catch (e) {
    if (e.code === 'EntityAlreadyExists') {
      return;
    }
    throw e;
  }
}
