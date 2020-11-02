import { DynamoDB } from 'aws-sdk';

import { IIssuer } from '@5qtrs/account-data';

import * as Constants from '@5qtrs/constants';

interface IIssuerCacheEntry {
  [kid: string]: { publicKey: string; ttl: number };
}

interface IIssuerCache {
  [issuerId: string]: IIssuerCacheEntry;
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
      publicKeys: (kid: string) => this.findKey(issuerId, kid),
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
    if (issuerId in this.cache && kid in this.cache[issuerId]) {
      if (this.cache[issuerId][kid].ttl < Date.now()) {
        delete this.cache[issuerId][kid];
        return undefined;
      }
      return this.cache[issuerId][kid].publicKey;
    }
    return undefined;
  }

  protected async refreshCache() {
    const params = {
      TableName: Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string),
      ExpressionAttributeValues: { ':cat': { S: Constants.RUNAS_ISSUER } },
      FilterExpression: `category = :cat`,
    };

    const results = await this.dynamo.scan(params).promise();

    // Clear the cache
    this.cache = {};
    if (!results.Items) {
      return;
    }

    // Populate it with the new items found
    results.Items.forEach((entry) => {
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

      if (!this.cache[entry.issuer.S]) {
        this.cache[entry.issuer.S] = {};
      }
      console.log(
        `IssuerCache: ${entry.issuer.S}:${entry.kid.S} for ${Date.now() - Number(entry.ttl.N)} time remaining`
      );
      this.cache[entry.issuer.S][entry.kid.S] = { publicKey: entry.publicKey.S, ttl: Number(entry.ttl.N) };
    });
  }
}

export { InternalIssuerCache };
