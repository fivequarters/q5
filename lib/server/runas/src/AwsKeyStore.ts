import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as Constants from '@5qtrs/constants';

import { KeyStore, KEYSTORE_MAX_KEY_TTL } from './KeyStore';

class AwsKeyStore extends KeyStore {
  protected dynamo: DynamoDB;
  protected storeId: string;

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
    this.storeId = uuidv4();
  }

  public async rekey(ttl: number = KEYSTORE_MAX_KEY_TTL): Promise<{ kid: string; publicKey: string }> {
    const { publicKey, kid } = await super.rekey(ttl);

    // Put to k-v with TTL
    await this.dynamo
      .putItem({
        TableName: Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string),
        Item: {
          category: { S: Constants.RUNAS_ISSUER },
          issuer: { S: this.storeId },
          key: { S: `${this.storeId}/${kid}` },
          kid: { S: kid },
          publicKey: { S: publicKey },
          ttl: { N: `${ttl}` },
        },
      })
      .promise();

    return { kid, publicKey };
  }

  public async signJwt(payload: any): Promise<string> {
    payload.iss = this.storeId;
    return super.signJwt(payload);
  }
}

export { AwsKeyStore };
