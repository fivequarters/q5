import AWS from 'aws-sdk';
import { maxSatisfying } from 'semver';

import * as Constants from '@5qtrs/constants';

import {
  InvalidScopeException,
  IRegistryConfig,
  IRegistryGlobalConfig,
  IRegistryInternalConfig,
  IRegistryParams,
  IRegistrySearchResults,
  IRegistryStore,
} from './Registry';

const s3Path = '/registry/npm';

type ExpressHandler = (reqExpress: Request, res: Response, next: any) => any;

class AWSRegistry implements IRegistryStore {
  public static handler(): ExpressHandler {
    return (reqExpress: Request, res: Response, next: any) => {
      const req: any = reqExpress;
      req.registry = AWSRegistry.create(req.params);
      return next();
    };
  }

  public static create(params: IRegistryParams, s3Opts?: any, dynamoDbOpts?: any): IRegistryStore {
    return new AWSRegistry(
      [params.accountId, params.registryId || Constants.REGISTRY_DEFAULT].join('/'),
      s3Opts,
      dynamoDbOpts
    );
  }

  private keyPrefix: string;
  private s3: AWS.S3;
  private ddb: AWS.DynamoDB;
  private tableName: string;

  constructor(prefix: string, s3Opts?: any, dynamoDbOpts?: any) {
    this.keyPrefix = prefix;
    this.s3 = new AWS.S3(s3Opts);
    this.ddb = new AWS.DynamoDB({
      apiVersion: '2012-08-10',
      httpOptions: {
        timeout: 5000,
      },
      maxRetries: 3,
      ...dynamoDbOpts,
    });
    this.tableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string);
  }

  public async put(key: string, pkg: any, payload: any): Promise<void> {
    // Upload file
    await this.s3
      .upload({
        Bucket: process.env.AWS_S3_BUCKET as string,
        Key: [this.keyPrefix, s3Path, key].join('/'),
        Body: payload,
      })
      .promise();

    // Add record to dynamodb.
    await this.ddb
      .putItem({
        TableName: this.tableName,
        Item: {
          category: { S: Constants.REGISTRY_CATEGORY },
          key: { S: [this.keyPrefix, key].join('/') },
          pkg: { S: JSON.stringify(pkg) },
          name: { S: pkg.name },
        },
      })
      .promise();
  }

  public findScope(cfg: IRegistryInternalConfig, key: string): IRegistryStore {
    const parts = key.split('/');
    if (parts.length !== 2) {
      throw new InvalidScopeException();
    }
    if (cfg.scopes.indexOf(parts[0]) >= 0) {
      return this;
    } else if (cfg.global.scopes.indexOf(parts[0]) >= 0) {
      return AWSRegistry.create(cfg.global.params);
    }
    throw new InvalidScopeException();
  }

  public async get(key: string): Promise<any> {
    try {
      const cfg = await this.internalConfigGet();

      // Delegate get's to the internal registry for scopes that match
      const reg: IRegistryStore = this.findScope(cfg, key);
      return this.internalGet(key);
    } catch (e) {
      return undefined;
    }
  }

  public async internalGet(key: string): Promise<any> {
    // Retrieve record from DynamoDB
    const result = await this.ddb
      .getItem({
        TableName: this.tableName,
        Key: {
          category: { S: Constants.REGISTRY_CATEGORY },
          key: { S: [this.keyPrefix, key].join('/') },
        },
      })
      .promise();
    return result && result.Item && result.Item.pkg ? JSON.parse(result.Item.pkg.S as string) : undefined;
  }

  public async tarball(key: string): Promise<any> {
    try {
      const cfg = await this.internalConfigGet();

      // Delegate get's to the internal registry for scopes that match
      const reg: IRegistryStore = this.findScope(cfg, key);
      return this.internalTarball(key);
    } catch (e) {
      return undefined;
    }
  }

  // Presumes the key has already been modified with the subscription/registry warts.
  public async internalTarball(key: any): Promise<string> {
    // Retrieve file from S3
    const signedUrlExpireSeconds = 60 * 5;

    const url = this.s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: [this.keyPrefix, s3Path, key].join('/'),
      Expires: signedUrlExpireSeconds,
    });

    return url;
  }

  public async semverGet(key: string, filter: string): Promise<string | null> {
    try {
      const pkg = await this.get(key);
      return maxSatisfying(Object.keys(pkg.versions), filter);
    } catch (e) {
      return null;
    }
  }

  public async search(keyword: string, count: number = 100, next?: string): Promise<any> {
    // Get any 'next' parameters supplied for the query.
    let nexts: (string | undefined)[];
    const split = next ? next.split('.') : [undefined, undefined];
    nexts = [split[0] || undefined, split[1] || undefined];

    // Because we have to do multiple queries, ignore the 'next' and 'count' for the internal search
    const results = await Promise.all([
      this.internalSearch(keyword, count / 2, next ? next.split('.')[0] : undefined),
      async (): Promise<any> => {
        // Search the global registry as well.
        const cfg = await this.internalConfigGet();

        if (!cfg.global.params.accountId) {
          // Not yet set; ignore.
          return { objects: [] };
        }

        const globalReg = (AWSRegistry.create(cfg.global.params) as unknown) as AWSRegistry;
        return globalReg.internalSearch(keyword, count / 2, next ? next.split('.')[1] : undefined);
      },
    ]);

    // Merge the results together.
    const final: IRegistrySearchResults = {
      objects: [...results[0].objects, ...results[1].objects],
      total: 0,
      time: new Date().toUTCString(),
    };
    final.total = final.objects.length;

    if (results[0].next || results[1].next) {
      final.next = `${results[0].next || ''}.${results[1].next || ''}`;
    }

    return final;
  }

  public async internalSearch(keyword: string, count: number = 100, next?: string): Promise<any> {
    // Build the request
    const params = {
      TableName: this.tableName,
      ProjectionExpression: 'category, #k, pkg',
      ExpressionAttributeNames: { '#k': 'key', '#n': 'name' },
      ExpressionAttributeValues: {
        ':searchCategory': { S: Constants.REGISTRY_CATEGORY },
        ':sortKeyPrefix': { S: this.keyPrefix },
        ':searchKey': { S: keyword },
      },
      KeyConditionExpression: `category = :searchCategory AND begins_with(#k, :sortKeyPrefix)`,
      // Filter based on the criteria supplied
      FilterExpression: 'contains(#n, :searchKey)',
      ExclusiveStartKey: next
        ? JSON.parse(Buffer.from(decodeURIComponent(next), 'base64').toString('utf8'))
        : undefined,
    };
    const result = await this.ddb.query(params).promise();
    const items = result.Items || [];

    return {
      objects: items.map((o: any) => ({ package: JSON.parse(o.pkg.S) })),
      total: items.length,
      time: new Date().toUTCString(),
      next: result.LastEvaluatedKey,
    };
  }

  // Refresh this registry's global configuration blob based on the current value.
  public async refreshGlobal(): Promise<void> {
    const global = ((await new AWSRegistry(
      Constants.REGISTRY_GLOBAL
    ).internalConfigGet()) as unknown) as IRegistryGlobalConfig;
    return this.globalConfigUpdate(global);
  }

  public async globalConfigUpdate(global: IRegistryGlobalConfig): Promise<void> {
    // Update just the global configuration.
    await this.ddb
      .updateItem({
        TableName: this.tableName,
        Key: {
          key: { S: this.keyPrefix },
          category: { S: Constants.REGISTRY_CATEGORY_CONFIG },
        },

        ExpressionAttributeNames: { '#G': 'global' },
        ExpressionAttributeValues: { ':g': { S: JSON.stringify(global) } },
        UpdateExpression: 'SET #G = :g',
      })
      .promise();
  }

  // Write the config as a global config object instead of the usual registry config
  public async globalConfigPut(global: IRegistryGlobalConfig): Promise<void> {
    // Add record to dynamodb.
    await this.ddb
      .putItem({
        TableName: this.tableName,
        Item: {
          category: { S: Constants.REGISTRY_CATEGORY_CONFIG },
          key: { S: this.keyPrefix },
          params: { S: JSON.stringify(global.params) },
          scopes: { SS: global.scopes },
        },
      })
      .promise();
  }

  public async configPut(config: IRegistryConfig): Promise<void> {
    // Update just the scopes
    await this.ddb
      .updateItem({
        TableName: this.tableName,
        Key: {
          key: { S: this.keyPrefix },
          category: { S: Constants.REGISTRY_CATEGORY_CONFIG },
        },
        ExpressionAttributeNames: { '#S': 'scopes' },
        ExpressionAttributeValues: { ':s': { SS: config.scopes } },
        UpdateExpression: 'SET #S = :s',
      })
      .promise();
  }

  public async configGet(): Promise<IRegistryConfig> {
    // Retrieve record from DynamoDB, and only return the scopes.
    const config = await this.internalConfigGet();
    return { scopes: [...config.scopes, ...config.global.scopes] };
  }

  public async internalConfigGet(): Promise<IRegistryInternalConfig> {
    const defaultGlobal: IRegistryGlobalConfig = { scopes: [], params: { accountId: '', registryId: '' } };

    // Retrieve record from DynamoDB
    const result = await this.ddb
      .getItem({
        TableName: this.tableName,
        Key: {
          category: { S: Constants.REGISTRY_CATEGORY_CONFIG },
          key: { S: this.keyPrefix },
        },
      })
      .promise();

    if (!result || !result.Item) {
      return { scopes: [], global: defaultGlobal };
    }

    return {
      scopes: result.Item.scopes ? (result.Item.scopes.SS as string[]) : [],
      global: result.Item.global ? JSON.parse(result.Item.global.S as string) : defaultGlobal,
    };
  }
}

export { AWSRegistry };
