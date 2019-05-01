import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { fromBase64, toBase64 } from '@5qtrs/base64';
import { DynamoDB } from 'aws-sdk';
import { AwsDynamoException } from './AwsDynamoException';

// ------------------
// Internal Constants
// ------------------

const delimiter = '.';
const defaultLimit = 25;
const maxLimit = 100;
const conditionCheckFailed = 'ConditionalCheckFailedException';
const resourceNotFoundException = 'ResourceNotFoundException';

// ------------------
// Internal Functions
// ------------------

function toAttributeDefinitions(attributes: { [index: string]: string }) {
  return Object.keys(attributes).map(name => ({
    AttributeName: name,
    AttributeType: attributes[name],
  }));
}

function toKeySchema(keys: string[]) {
  return keys.map((key, i) => ({ AttributeName: key, KeyType: i ? 'RANGE' : 'HASH' }));
}

function getProjectionType(projection?: string[]) {
  if (projection === undefined) {
    return 'ALL';
  }
  return projection.length ? 'INCLUDE' : 'KEYS_ONLY';
}

function toIndexDefinition(index: IAwsDynamoIndex) {
  const name = index.name;
  const keys = toKeySchema(index.keys);
  const projection: any = {
    ProjectionType: getProjectionType(index.projection),
  };
  if (projection.ProjectionType === 'INCLUDE') {
    projection.NonKeyAttributes = index.projection;
  }
  return {
    IndexName: name,
    KeySchema: keys,
    Projection: projection,
  };
}

function applyOptions(options: any, params: any) {
  if (options) {
    if (options.index) {
      params.IndexName = options.index;
    }
    if (options.limit) {
      const parsed = parseInt(options.limit, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw AwsDynamoException.invalidLimit(options.limit);
      }
      params.Limit = parsed;
    }
    if (options.consistentRead) {
      params.ConsistentRead = true;
    }
    if (options.next) {
      params.ExclusiveStartKey = nextToExclusiveStartKey(options.next);
    }
    if (options.projection) {
      params.ProjectionExpression = options.projection;
    }
    if (options.sets || options.removes) {
      const updates = [];
      if (options.removes && options.removes.length) {
        updates.push(`REMOVE ${options.removes.join(', ')}`);
      }
      if (options.sets && options.sets.length) {
        updates.push(`SET ${options.sets.join(', ')}`);
      }
      params.UpdateExpression = updates.join(' ');
    }
    if (options.keyConditions && options.keyConditions.length) {
      params.KeyConditionExpression = options.keyConditions.join(' and ');
    }
    if (options.conditions && options.conditions.length) {
      params.ConditionExpression = options.conditions.join(' and ');
    }
    if (options.filters && options.filters.length) {
      params.FilterExpression = options.filters.join(' and ');
    }
    if (options.expressionNames) {
      params.ExpressionAttributeNames = options.expressionNames;
    }
    if (options.expressionValues) {
      params.ExpressionAttributeValues = options.expressionValues;
    }
  }
}

function applyLimit(table: IAwsDynamoTable, params: any) {
  const config = table.getConfig ? table.getConfig() : undefined;
  const configuredDefaultLimit = (config ? config.defaultLimit : undefined) || defaultLimit;
  const configuredMaxLimit = (config ? config.maxLimit : undefined) || maxLimit;
  if (!params.Limit || params.Limit < 0) {
    params.Limit = configuredDefaultLimit;
  } else if (params.Limit > configuredMaxLimit) {
    params.Limit = configuredMaxLimit;
  }
}

function nextToExclusiveStartKey(next: string): any {
  try {
    const json = fromBase64(next);
    return JSON.parse(json);
  } catch (error) {
    throw AwsDynamoException.invalidNext(next);
  }
}

function lastEvaluatedKeyToNext(lastEvaluatedKey: any) {
  const json = JSON.stringify(lastEvaluatedKey);
  return toBase64(json);
}

function errorToException(table: string, action: string, error: any) {
  if (error.code === conditionCheckFailed) {
    return AwsDynamoException.conditionCheckFailed(table, action, error);
  }
  return AwsDynamoException.databaseError(table, action, error);
}

function isItemArchived(item: any) {
  return item && item.archived && item.archived.BOOL && item.archived.BOOL === true ? true : false;
}

function setConditionOptionsForArchive(options?: IAwsDynamoUpdateOptions) {
  options = options || {};
  options.conditions = options.conditions || [];
  options.expressionNames = options.expressionNames || {};
  options.expressionValues = options.expressionValues || {};
  options.conditions.push('#archived <> :archived');
  options.expressionNames['#archived'] = 'archived';
  options.expressionValues[':archived'] = { BOOL: true };
  return options;
}

function setScanOptionsForArchive(options?: IAwsDynamoScanOptions) {
  options = options || {};
  options.filters = options.filters || [];
  options.expressionNames = options.expressionNames || {};
  options.expressionValues = options.expressionValues || {};
  options.filters.push('#archived <> :archived');
  options.expressionNames['#archived'] = 'archived';
  options.expressionValues[':archived'] = { BOOL: true };
  return options;
}

function setConditionsForUpdate(table: IAwsDynamoTable, key: any, options?: IAwsDynamoSetOptions) {
  options = options || {};
  options.expressionNames = options.expressionNames || {};
  options.expressionValues = options.expressionValues || {};
  options.conditions = options.conditions || [];
  for (const tableKey of table.keys) {
    options.expressionNames[`#${tableKey}`] = tableKey;
    options.expressionValues[`:${tableKey}`] = key[tableKey];
    options.conditions.push(`#${tableKey} = :${tableKey}`);
  }
  return options;
}

function setConditionsForAdd(table: IAwsDynamoTable, options?: IAwsDynamoSetOptions) {
  options = options || {};
  options.expressionNames = options.expressionNames || {};
  options.conditions = options.conditions || [];
  for (const tableKey of table.keys) {
    options.expressionNames[`#${tableKey}`] = tableKey;
    options.conditions.push(`attribute_not_exists(#${tableKey})`);
  }
  return options;
}

function mapKeys(table: IAwsDynamoTable, keys: any[], options?: IAwsDynamoAllOptions) {
  if (table.toKey) {
    return keys.map(key => (table.toKey ? table.toKey(key, options ? options.context : undefined) : key));
  }
  return keys.slice();
}

function mapItems(table: IAwsDynamoTable, items: any[], options?: IAwsDynamoAllOptions) {
  if (!table.toItem && !table.ttlAttribute) {
    items = items.slice();
  } else {
    if (table.toItem) {
      items = items.map(item => (table.toItem ? table.toItem(item, options ? options.context : undefined) : item));
    }
    if (table.ttlAttribute) {
      items = items.map(item => updateTtlOnSet(table, item));
    }
  }
  return items;
}

function onGetItem(table: IAwsDynamoTable, key: any, item: any, options?: IAwsDynamoGetOptions) {
  let result;
  if (item && (!table.archive || !isItemArchived(item))) {
    updateTtlOnGet(table, item);
    result = table.fromItem ? table.fromItem(item) : item;
  }
  if (options && options.onNotFound && (result === undefined || ttlExpired(table, item))) {
    result = options.onNotFound(key);
  }
  return result;
}

function updateTtlOnSet(table: IAwsDynamoTable, item: any) {
  if (item && table.ttlAttribute) {
    const attribute = table.ttlAttribute;
    const delta = item[attribute];
    if (delta) {
      const parsed = parseInt(delta.N, 10);
      if (isNaN(parsed)) {
        throw AwsDynamoException.invalidTtl(delta.N);
      }
      item[attribute].N = Math.floor((Date.now() + parsed) / 1000).toString();
    }
  }
  return item;
}

function updateTtlOnGet(table: IAwsDynamoTable, item: any) {
  if (item && table.ttlAttribute) {
    const attribute = table.ttlAttribute;
    const absolute = item[attribute];
    if (absolute) {
      const inMilliseconds = parseInt(absolute.N, 10) * 1000;
      const now = Date.now();
      item[attribute].N = (inMilliseconds - now).toString();
    }
  }
  return item;
}

function ttlExpired(table: IAwsDynamoTable, item: any) {
  if (item && table.ttlAttribute) {
    const attribute = table.ttlAttribute;
    const remaining = item[attribute];
    if (remaining) {
      const parsed = parseInt(remaining.N, 10);
      return parsed < 0;
    }
  }
}

function rejectOnce(reject: (reason?: any) => void) {
  let rejected = false;
  return (actualReason?: any): void => {
    if (!rejected) {
      rejected = true;
      reject(actualReason);
    }
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsDynamoAllOptions {
  context?: any;
}

export interface IAwsDynamoGetAllOptions extends IAwsDynamoAllOptions {
  onNotFound?: (key: any) => any;
}

export interface IAwsDynamoGetOptions extends IAwsDynamoGetAllOptions {
  expressionNames?: { [index: string]: string };
  projection?: string;
}

export interface IAwsDynamoSetOptions extends IAwsDynamoAllOptions {
  expressionNames?: { [index: string]: any };
  expressionValues?: { [index: string]: any };
  conditions?: string[];
  onConditionCheckFailed?: (key: any, error: Error) => void;
}

export interface IAwsDynamoUpdateOptions extends IAwsDynamoAllOptions {
  expressionNames?: { [index: string]: any };
  expressionValues?: { [index: string]: any };
  sets?: string[];
  removes?: string[];
  conditions?: string[];
  onConditionCheckFailed?: (item: any, error: Error) => void;
}

export interface IAwsDynamoScanOptions {
  index?: string;
  expressionNames?: { [index: string]: string };
  expressionValues?: { [index: string]: any };
  projection?: string;
  filters?: string[];
  limit?: number;
  maxLimit?: number;
  consistentRead?: boolean;
  next?: string;
}

export interface IAwsDynamoQueryOptions extends IAwsDynamoScanOptions {
  keyConditions?: string[];
  scanForward?: boolean;
}

export interface IAwsDynamoItems {
  items: any[];
  next?: string;
}

export interface IAwsDynamoIndex {
  name: string;
  keys: string[];
  projection?: string[];
}

export interface IAwsDynamoTableConfig {
  defaultLimit?: number;
  maxLimit?: number;
}

export interface IAwsDynamoTable {
  name: string;
  attributes: { [index: string]: string };
  keys: string[];
  globalIndexes?: IAwsDynamoIndex[];
  localIndexes?: IAwsDynamoIndex[];
  ttlAttribute?: string;
  archive?: boolean;
  toKey?: (input: any, context?: any) => any;
  toItem?: (input: any, context?: any) => any;
  fromItem?: (item: any) => any;
  getConfig?: () => IAwsDynamoTableConfig;
}

// ----------------
// Exported Classes
// ----------------

export class AwsDynamo extends AwsBase<typeof DynamoDB> {
  public static async create(config: IAwsConfig) {
    return new AwsDynamo(config);
  }
  private constructor(config: IAwsConfig) {
    super(config, delimiter);
  }

  public async ensureTable(table: IAwsDynamoTable): Promise<void> {
    const exists = await this.tableExists(table.name);
    if (exists) {
      return;
    }

    const arn = await this.createTable(table);
    await this.waitForTable(table.name);
    await this.tagResource(arn);
    if (table.ttlAttribute !== undefined) {
      await this.updateTtl(table.name, table.ttlAttribute);
    }
  }

  public async getItem(table: IAwsDynamoTable, key: any, options?: IAwsDynamoGetOptions): Promise<any> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);

    const params: any = {
      TableName: fullTableName,
      Key: table.toKey ? table.toKey(key, options ? options.context : undefined) : key,
    };

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.getItem(params, (error: any, data: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'getItem', error));
        }
        let item;
        try {
          item = onGetItem(table, key, data.Item, options);
        } catch (thrownError) {
          return reject(thrownError);
        }
        resolve(item);
      });
    });
  }

  public async getAllItems(table: IAwsDynamoTable, keys: any[], options?: IAwsDynamoGetAllOptions): Promise<any[]> {
    keys = mapKeys(table, keys, options);

    const all = [];
    while (keys.length) {
      const next = keys.splice(0, 25);
      const [items, unprocessed] = await this.getBatch(table.name, next);
      all.push(...items);
      if (unprocessed) {
        keys.unshift(...unprocessed);
      }
    }

    return all.map((item, index) => onGetItem(table, keys[index], item, options));
  }

  public async addItem(table: IAwsDynamoTable, item: any, options?: IAwsDynamoSetOptions): Promise<void> {
    options = setConditionsForAdd(table, options);
    return this.putItem(table, item, options);
  }

  public async putItem(table: IAwsDynamoTable, item: any, options?: IAwsDynamoSetOptions): Promise<void> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);

    const params: any = {
      TableName: fullTableName,
      Item: table.toItem ? table.toItem(item, options ? options.context : undefined) : item,
    };

    updateTtlOnSet(table, params.Item);

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.putItem(params, (error: any) => {
        if (error) {
          if (error.code === conditionCheckFailed && options && options.onConditionCheckFailed) {
            try {
              options.onConditionCheckFailed(item, error);
            } catch (thrownError) {
              error = thrownError;
            }
          } else {
            error = errorToException(fullTableName, 'putItem', error);
          }
          return reject(error);
        }
        resolve();
      });
    });
  }

  public async putAllItems(table: IAwsDynamoTable, items: any[], options?: IAwsDynamoAllOptions): Promise<void> {
    items = mapItems(table, items, options);
    while (items.length) {
      const next = items.splice(0, 25);
      const unprocessed = await this.putBatch(table.name, next);
      items.unshift(...unprocessed);
    }
  }

  public async updateItem(table: IAwsDynamoTable, key: any, options?: IAwsDynamoUpdateOptions): Promise<any> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);

    const params: any = {
      TableName: fullTableName,
      Key: table.toKey ? table.toKey(key, options ? options.context : undefined) : key,
      ReturnValues: 'ALL_NEW',
    };

    if (table.archive) {
      options = setConditionOptionsForArchive(options);
    }

    options = setConditionsForUpdate(table, params.Key, options);

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.updateItem(params, (error: any, data: any) => {
        if (error) {
          if (error.code === conditionCheckFailed && options && options.onConditionCheckFailed) {
            try {
              options.onConditionCheckFailed(key, error);
            } catch (thrownError) {
              error = thrownError;
            }
          } else {
            error = errorToException(fullTableName, 'updateItem', error);
          }
          return reject(error);
        }
        let item;
        try {
          updateTtlOnGet(table, data.Attributes);
          item = table.fromItem ? table.fromItem(data.Attributes) : data.Attributes;
        } catch (error) {
          return reject(error);
        }
        resolve(item);
      });
    });
  }

  public async archiveItem(table: IAwsDynamoTable, key: any, options?: IAwsDynamoSetOptions): Promise<void> {
    return this.setArchived(table, key, true, options);
  }

  public async unarchiveItem(table: IAwsDynamoTable, key: any, options?: IAwsDynamoSetOptions): Promise<void> {
    return this.setArchived(table, key, false, options);
  }

  public async deleteItem(table: IAwsDynamoTable, key: any, options?: IAwsDynamoSetOptions): Promise<void> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);

    const params: any = {
      TableName: fullTableName,
      Key: table.toKey ? table.toKey(key, options ? options.context : undefined) : key,
    };

    options = setConditionsForUpdate(table, params.Key, options);

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      dynamo.deleteItem(params, (error: any, data: any) => {
        if (error) {
          if (error.code === conditionCheckFailed && options && options.onConditionCheckFailed) {
            try {
              options.onConditionCheckFailed(key, error);
            } catch (thrownError) {
              error = thrownError;
            }
          } else {
            error = errorToException(fullTableName, 'deleteItem', error);
          }
          return reject(error);
        }

        resolve();
      });
    });
  }

  public async deleteAllItems(table: IAwsDynamoTable, keys: any[], options?: IAwsDynamoAllOptions): Promise<void> {
    keys = mapKeys(table, keys, options);

    while (keys.length) {
      const next = keys.splice(0, 25);
      const unprocessed = await this.deleteBatch(table.name, next);
      keys.unshift(...unprocessed);
    }
  }

  public async queryTable(table: IAwsDynamoTable, options?: IAwsDynamoQueryOptions): Promise<IAwsDynamoItems> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);

    const params: any = {
      TableName: fullTableName,
      ScanIndexForward: options && options.scanForward === false ? false : true,
    };

    if (table.archive) {
      options = setScanOptionsForArchive(options);
    }

    applyOptions(options, params);
    applyLimit(table, params);

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.query(params, (error: any, data: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'queryTable', error));
        }

        let items;
        try {
          if (table.ttlAttribute) {
            data.Items = data.Items.map((item: any) => updateTtlOnGet(table, item));
          }
          items = table.fromItem ? data.Items.map(table.fromItem) : data.Items;
        } catch (thrownError) {
          return reject(thrownError);
        }
        const next = data.LastEvaluatedKey ? lastEvaluatedKeyToNext(data.LastEvaluatedKey) : undefined;
        resolve({ items, next });
      });
    });
  }

  public async scanTable(table: IAwsDynamoTable, options?: IAwsDynamoScanOptions): Promise<IAwsDynamoItems> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);

    const params: any = {
      TableName: fullTableName,
    };

    if (table.archive) {
      options = setScanOptionsForArchive(options);
    }

    applyOptions(options, params);
    applyLimit(table, params);

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.scan(params, (error: any, data: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'scanTable', error));
        }

        let items;
        try {
          if (table.ttlAttribute) {
            data.Items = data.Items.map((item: any) => updateTtlOnGet(table, item));
          }
          items = table.fromItem ? data.Items.map(table.fromItem) : data.Items;
        } catch (thrownError) {
          return reject(thrownError);
        }
        const next = data.LastEvaluatedKey ? lastEvaluatedKeyToNext(data.LastEvaluatedKey) : undefined;
        resolve({ items, next });
      });
    });
  }

  public async deleteTable(tableName: string): Promise<void> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(tableName);
    const params = {
      TableName: fullTableName,
    };

    return new Promise((resolve, reject) => {
      dynamo.deleteTable(params, (error: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'deleteTable', error));
        }

        dynamo.waitFor('tableNotExists', params, () => resolve());
      });
    });
  }

  public async tableExists(tableName: string): Promise<boolean> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(tableName);
    const params = {
      TableName: fullTableName,
    };
    return new Promise((resolve, reject) => {
      dynamo.describeTable(params, (error: any, data: any) => {
        if (error) {
          if (error.code === resourceNotFoundException) {
            return resolve(false);
          }
          return reject(errorToException(fullTableName, 'tableExists', error));
        }
        resolve(true);
      });
    });
  }

  protected onGetAws(config: IAwsConfig) {
    return new DynamoDB(config);
  }

  private async waitForTable(tableName: string): Promise<void> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(tableName);
    const params = {
      TableName: fullTableName,
    };
    return new Promise((resolve, reject) => {
      dynamo.waitFor('tableExists', params, (error: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'waitForTable', error));
        }
        resolve();
      });
    });
  }

  private async getBatch(tableName: string, keys: any[]): Promise<[any[], any[]]> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(tableName);

    const params: any = { RequestItems: {} };
    params.RequestItems[fullTableName] = { Keys: keys };

    return new Promise((resolve, reject) => {
      dynamo.batchGetItem(params, (error: any, data: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'getBatch', error));
        }
        const items = data.Responses[fullTableName];
        const unprocessed = data.UnprocessedKeys ? data.UnprocessedKeys[fullTableName] : [];
        resolve([items, unprocessed]);
      });
    });
  }

  private async putBatch(tableName: string, items: any[]): Promise<any[]> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(tableName);

    const params: any = { RequestItems: {} };
    params.RequestItems[fullTableName] = items.map(item => ({ PutRequest: { Item: item } }));

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.batchWriteItem(params, (error: any, data: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'putBatch', error));
        }
        const unprocessed = data.UnprocessedItems[fullTableName];
        resolve(unprocessed ? unprocessed.map((item: any) => item.PutRequest.Item) : []);
      });
    });
  }

  private async deleteBatch(tableName: string, keys: any[]): Promise<any[]> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(tableName);

    const params: any = { RequestItems: {} };
    params.RequestItems[fullTableName] = keys.map(key => ({ DeleteRequest: { Key: key } }));

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.batchWriteItem(params, (error: any, data: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'deleteBatch', error));
        }
        const unprocessed = data.UnprocessedItems[fullTableName];
        resolve(unprocessed ? unprocessed.map((key: any) => key.DeleteRequest.Key) : []);
      });
    });
  }

  private async setArchived(
    table: IAwsDynamoTable,
    key: any,
    archive: boolean,
    options?: IAwsDynamoUpdateOptions
  ): Promise<void> {
    if (!table.archive) {
      throw AwsDynamoException.archiveNotEnabled(table.name);
    }
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);

    const params: any = {
      TableName: fullTableName,
      Key: table.toKey ? table.toKey(key, options ? options.context : undefined) : key,
    };

    options = setConditionsForUpdate(table, params.Key, options);

    options.expressionNames = options.expressionNames || {};
    options.expressionValues = options.expressionValues || {};
    options.conditions = options.conditions || [];

    options.sets = ['#archived = :archived'];
    options.expressionNames['#archived'] = 'archived';
    options.expressionValues[':archived'] = { BOOL: archive };
    options.conditions.push('#archived <> :archived');

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      reject = rejectOnce(reject);
      dynamo.updateItem(params, (error: any) => {
        if (error) {
          if (error.code === conditionCheckFailed && options && options.onConditionCheckFailed) {
            try {
              options.onConditionCheckFailed(key, error);
            } catch (thrownError) {
              error = thrownError;
            }
          } else {
            error = errorToException(fullTableName, 'archiveItem', error);
          }
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async updateTtl(tableName: string, attribute: string): Promise<void> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(tableName);
    const params = {
      TableName: fullTableName,
      TimeToLiveSpecification: {
        AttributeName: attribute,
        Enabled: true,
      },
    };

    return new Promise((resolve, reject) => {
      dynamo.updateTimeToLive(params, (error: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'updateTtl', error));
        }
        resolve();
      });
    });
  }

  private async tagResource(arn: string): Promise<void> {
    const dynamo = await this.getAws();
    const params = {
      ResourceArn: arn,
      Tags: [
        {
          Key: 'account',
          Value: this.awsAccount,
        },
        {
          Key: 'region',
          Value: this.awsRegion,
        },
      ],
    };

    const prefix = this.getPrefix();
    if (prefix) {
      params.Tags.push({
        Key: 'prefix',
        Value: prefix,
      });
    }

    return new Promise((resolve, reject) => {
      dynamo.tagResource(params, (error: any) => {
        if (error) {
          return reject(errorToException(arn, 'tagResource', error));
        }
        resolve();
      });
    });
  }

  private async createTable(table: IAwsDynamoTable): Promise<string> {
    const dynamo = await this.getAws();
    const fullTableName = this.getFullName(table.name);
    const params: any = {
      TableName: fullTableName,
      AttributeDefinitions: toAttributeDefinitions(table.attributes),
      KeySchema: toKeySchema(table.keys),
      BillingMode: 'PAY_PER_REQUEST',
      SSESpecification: {
        Enabled: true,
      },
    };

    if (table.localIndexes && table.localIndexes.length) {
      params.LocalSecondaryIndexes = table.localIndexes.map(toIndexDefinition);
    }

    if (table.globalIndexes && table.globalIndexes.length) {
      params.GlobalSecondaryIndexes = table.globalIndexes.map(toIndexDefinition);
    }

    return new Promise((resolve, reject) => {
      dynamo.createTable(params, (error: any, data: any) => {
        if (error) {
          return reject(errorToException(fullTableName, 'createTable', error));
        }

        resolve(data.TableDescription.TableArn);
      });
    });
  }
}
