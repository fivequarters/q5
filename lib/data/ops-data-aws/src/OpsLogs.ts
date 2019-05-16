import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig } from '@5qtrs/aws-config';

export async function createLogsTable(config: OpsDataAwsConfig, awsConfig: IAwsConfig) {
  const awsDynamo = await AwsDynamo.create(awsConfig);
  await awsDynamo.ensureTable({
    name: 'log',
    attributes: { subscriptionBoundary: 'S', timestamp: 'N' },
    keys: ['subscriptionBoundary', 'timestamp'],
    ttlAttribute: 'ttl',
  });
}
