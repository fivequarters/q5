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

const s3Path = 'registry/npm';

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

  public async put(name: string, pkg: any, ver: string, payload: any): Promise<void> {
    // Upload file
    await this.s3
      .upload({
        Bucket: process.env.AWS_S3_BUCKET as string,
        Key: this.getS3Path(`${name}@${ver}`),
        Body: payload,
      })
      .promise();

    // Add record to dynamodb.
    await this.ddb
      .putItem({
        TableName: this.tableName,
        Item: {
          category: { S: Constants.REGISTRY_CATEGORY },
          key: { S: this.getDynamoKey(name) },
          pkg: { S: JSON.stringify(pkg) },
          name: { S: pkg.name },
        },
      })
      .promise();
  }

  // Determine whether the scope in the key is part of this registry, or part of the global registry.  Return
  // a registry object that matches the target namespace.
  public findScope(cfg: IRegistryInternalConfig, name: string): AWSRegistry {
    const parts = name.split('/');
    if (parts.length !== 2) {
      throw new InvalidScopeException();
    }

    if (cfg.scopes.indexOf(parts[0]) >= 0) {
      return this;
    } else if (cfg.global.scopes.indexOf(parts[0]) >= 0) {
      return (AWSRegistry.create(cfg.global.params) as unknown) as AWSRegistry;
    }
    throw new InvalidScopeException();
  }

  public async get(name: string): Promise<any> {
    try {
      const cfg = await this.internalConfigGet();

      // Delegate get's to the global registry for scopes that match
      const reg: AWSRegistry = this.findScope(cfg, name);
      return reg.internalGet(name);
    } catch (e) {
      return undefined;
    }
  }

  public async internalGet(name: string): Promise<any> {
    // Retrieve record from DynamoDB
    const result = await this.ddb
      .getItem({
        TableName: this.tableName,
        Key: {
          category: { S: Constants.REGISTRY_CATEGORY },
          key: { S: this.getDynamoKey(name) },
        },
      })
      .promise();
    return result && result.Item && result.Item.pkg ? JSON.parse(result.Item.pkg.S as string) : undefined;
  }

  public async delete(name: string): Promise<any> {
    // Remove the document from dynamodb
    const pkg = await this.internalGet(name);
    const result = await this.ddb
      .deleteItem({
        TableName: this.tableName,
        Key: {
          category: { S: Constants.REGISTRY_CATEGORY },
          key: { S: [this.keyPrefix, name].join('/') },
        },
      })
      .promise();

    // NYI: Remove all of the tarballs from S3
  }

  public async tarballGet(nameVer: string): Promise<any> {
    try {
      const cfg = await this.internalConfigGet();

      // Delegate get's to the global registry for scopes that match
      const reg: AWSRegistry = this.findScope(cfg, nameVer);
      return reg.internalTarball(nameVer);
    } catch (e) {
      return undefined;
    }
  }

  public async tarballDelete(nameVer: string): Promise<any> {
    // NYI.
    return 0;
  }

  // Presumes the key has already been modified with the subscription/registry warts.
  public async internalTarball(nameVer: any): Promise<string> {
    // Retrieve file from S3
    const signedUrlExpireSeconds = 60 * 5;

    const url = await this.s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: this.getS3Path(nameVer),
      Expires: signedUrlExpireSeconds,
    });

    return url;
  }

  public async semverGet(name: string, filter: string): Promise<string | null> {
    try {
      const pkg = await this.get(name);
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

    const results = await Promise.all([
      this.internalSearch(keyword, count / 2, nexts[0]),
      (async (): Promise<any> => {
        // Search the global registry as well.
        const cfg = await this.internalConfigGet();

        if (!cfg.global.params.accountId) {
          // Not yet set; ignore.
          return { objects: [] };
        }

        const globalReg = (AWSRegistry.create(cfg.global.params) as unknown) as AWSRegistry;
        return globalReg.internalSearch(keyword, count / 2, nexts[1]);
      })(),
    ]);

    // Merge the results together.
    const ret: IRegistrySearchResults = {
      objects: [...results[0].objects, ...results[1].objects],
      total: 0,
      time: new Date().toUTCString(),
    };
    ret.total = ret.objects.length;

    if (results[0].next || results[1].next) {
      ret.next = `${results[0].next || ''}.${results[1].next || ''}`;
    }

    return ret;
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

  // Refresh this registry's global configuration blob based on the current value.
  public async refreshGlobal(): Promise<void> {
    const global = await this.globalConfigGet();
    if (global) {
      return this.globalConfigUpdate(global);
    }
  }

  // Write the config as a global config object instead of the usual registry config
  public async globalConfigPut(global: IRegistryGlobalConfig): Promise<void> {
    // Add record to dynamodb.
    await this.ddb
      .putItem({
        TableName: this.tableName,
        Item: {
          category: { S: Constants.REGISTRY_CATEGORY_CONFIG },
          key: { S: Constants.REGISTRY_GLOBAL },
          params: { S: JSON.stringify(global.params) },
          scopes: { SS: global.scopes },
        },
      })
      .promise();
  }

  // Write the config as a global config object instead of the usual registry config
  public async globalConfigGet(): Promise<IRegistryGlobalConfig | undefined> {
    // Add record to dynamodb.
    const result = await this.ddb
      .getItem({
        TableName: this.tableName,
        Key: {
          category: { S: Constants.REGISTRY_CATEGORY_CONFIG },
          key: { S: Constants.REGISTRY_GLOBAL },
        },
      })
      .promise();

    if (result.Item) {
      return { params: JSON.parse(result.Item.params.S as string), scopes: result.Item.scopes.SS as string[] };
    }
  }

  public async globalConfigUpdate(global: IRegistryGlobalConfig): Promise<void> {
    // Update just the global configuration of this registry
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

  private getS3Path(nameVer: string): string {
    return [s3Path, this.keyPrefix, nameVer].join('/');
  }

  private getDynamoKey(name: string): string {
    return [this.keyPrefix, name].join('/');
  }
}

export { AWSRegistry };
