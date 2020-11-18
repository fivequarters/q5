import { DynamoDB } from 'aws-sdk';

import * as Constants from '@5qtrs/constants';

import { IKeyPair, KeyStore } from './KeyStore';

class AwsKeyStore extends KeyStore {
  protected dynamo: DynamoDB;

  constructor(options: any) {
    super(options);
    this.dynamo =
      options.dynamo ||
      new DynamoDB({
        apiVersion: '2012-08-10',
        httpOptions: {
          timeout: 5000,
        },
        maxRetries: 3,
      });
  }

  public async rekey(): Promise<IKeyPair> {
    const keyPair = await this.createKey();
    const { kid, publicKey, ttl } = keyPair;

    // Put to k-v with TTL
    await this.dynamo
      .putItem({
        TableName: Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string),
        Item: {
          category: { S: Constants.RUNAS_ISSUER },
          key: { S: `${kid}` },
          issuer: { S: Constants.makeSystemIssuerId(kid) },
          kid: { S: kid },
          publicKey: { S: publicKey },
          ttl: { N: `${Math.floor(ttl / 1000)}` },
        },
      })
      .promise();

    super.setKeyPair(keyPair);
    return keyPair;
  }
}

export { AwsKeyStore };
