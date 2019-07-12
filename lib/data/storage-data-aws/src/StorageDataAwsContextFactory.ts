import { IStorageDataContextFactory } from '@5qtrs/storage-data';
import { IConfig } from '@5qtrs/config';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { StorageDataAwsContext } from './StorageDataAwsContext';
import { StorageDataAwsConfig } from './StorageDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class StorageDataAwsContextFactory implements IStorageDataContextFactory {
  public static async create(awsConfig: IAwsConfig) {
    return new StorageDataAwsContextFactory(awsConfig);
  }

  private awsConfig: IAwsConfig;

  private constructor(awsConfig: IAwsConfig) {
    this.awsConfig = awsConfig;
  }

  public async create(config: IConfig): Promise<StorageDataAwsContext> {
    const fullConfig = await StorageDataAwsConfig.create(config);
    const dynamo = await AwsDynamo.create(this.awsConfig);
    return StorageDataAwsContext.create(fullConfig, dynamo);
  }
}
