import { DynamoDB } from 'aws-sdk';

import { IIssuer } from '@5qtrs/account-data';

import * as Constants from '@5qtrs/constants';

interface IIssuerCache {
  [kid: string]: { publicKey: string; ttl: number };
}

class InternalIssuerCache {
  protected cache: IIssuerCache = {};
  protected dynamo: DynamoDB;

  constructor(options: any) {
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

  public async findInternalIssuer(issuerId: string): Promise<IIssuer> {
    return {
      id: issuerId,
      displayName: 'System',
      keyStore: (kid: string) => this.findKey(issuerId, kid),
    };
  }

  public async findKey(issuerId: string, kid: string): Promise<string> {
    console.log(`InternalIssuerCache findKey ${issuerId} ${kid}`);
    // Check the cache to see if the issuerId+kid is present
    const publicKey = this.findValid(issuerId, kid);
    if (publicKey) {
      return publicKey;
    }

    // Key isn't found; rebuild cache and try again, returning either a valid key or a guaranteed-failure to
    // trigger an invalidJwt error later.
    await this.refreshCache();
    return this.findValid(issuerId, kid) || 'AAAAAAAAAAAAA';
  }

  protected findValid(issuerId: string, kid: string): string | undefined {
    if (kid in this.cache) {
      if (this.cache[kid].ttl < Date.now()) {
        delete this.cache[kid];
        return undefined;
      }
      return this.cache[kid].publicKey;
    }
    return undefined;
  }

  protected async refreshCache() {
    const params = {
      TableName: Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string),
      ExpressionAttributeValues: { ':cat': { S: Constants.RUNAS_ISSUER } },
      FilterExpression: `category = :cat`,
    };

    const results = await Constants.dynamoScanTable(this.dynamo, params);

    // Clear the cache
    this.cache = {};
    if (!results.length) {
      return;
    }

    // Populate it with the new items found
    results.forEach((entry) => {
      // Valid DynamoDB record according to typescript?
      if (
        !entry.issuer ||
        !entry.issuer.S ||
        !entry.kid ||
        !entry.kid.S ||
        !entry.publicKey ||
        !entry.publicKey.S ||
        !entry.ttl ||
        !entry.ttl.N
      ) {
        return;
      }

      this.cache[entry.kid.S] = { publicKey: entry.publicKey.S, ttl: Number(entry.ttl.N) * 1000 };
    });
  }
}

export { InternalIssuerCache };
