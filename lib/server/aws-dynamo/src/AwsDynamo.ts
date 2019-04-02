import { AwsBase, IAwsOptions } from '@5qtrs/aws-base';
import { DynamoDB } from 'aws-sdk';

// ------------------
// Internal Constants
// ------------------

const defaultCollisionRetries = 5;
const alreadyExistsCode = 'ConditionalCheckFailedException';

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

function toIndexDefinition(index: IAwsLambdaIndex) {
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
      params.Limit = options.limit;
    }
    if (options.consistentRead) {
      params.ConsistentRead = true;
    }
    if (options.next) {
      params.ExclusiveStartKey = options.next;
    }
    if (options.keyCondition) {
      params.KeyConditionExpression = options.keyCondition;
    }
    if (options.condition) {
      params.ConditionExpression = options.condition;
    }
    if (options.update) {
      params.UpdateExpression = options.update;
    }
    if (options.projection) {
      params.ProjectionExpression = options.projection;
    }
    if (options.filter) {
      params.FilterExpression = options.filter;
    }
    if (options.expressionNames) {
      params.ExpressionAttributeNames = options.expressionNames;
    }
    if (options.expressionValues) {
      params.ExpressionAttributeValues = options.expressionValues;
    }
  }
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsLambdaGetOptions {
  expressionNames: { [index: string]: string };
  projection: string;
}

export interface IAwsLambdaPutOptions {
  expressionNames?: { [index: string]: any };
  expressionValues?: { [index: string]: any };
  condition?: string;
  returnOld?: boolean;
}

export interface IAwsLambdaAddOptions {
  expressionNames?: { [index: string]: any };
  expressionValues?: { [index: string]: any };
  condition: string;
  collisionRetries?: number;
  onCollision?: (item: any) => any;
}

export interface IAwsLambdaUpdateOptions extends IAwsLambdaPutOptions {
  update?: string;
}

export interface IAwsLambdaDeleteOptions extends IAwsLambdaPutOptions {}

export interface IAwsLambdaScanOptions {
  index?: string;
  expressionNames?: { [index: string]: string };
  expressionValues?: { [index: string]: any };
  projection?: string;
  filter?: string;
  limit?: number;
  consistentRead?: boolean;
  next?: any;
}

export interface IAwsLambdaQueryOptions extends IAwsLambdaScanOptions {
  keyCondition?: string;
  scanForward?: boolean;
}

export interface IAwsLambdaItems {
  items: any[];
  next?: any;
}

export interface IAwsLambdaIndex {
  name: string;
  keys: string[];
  projection?: string[];
}

export interface IAwsLambdaTable {
  name: string;
  attributes: { [index: string]: string };
  keys: string[];
  globalIndexes?: IAwsLambdaIndex[];
  localIndexes?: IAwsLambdaIndex[];
  ttlAttribute?: string;
}

// ----------------
// Exported Classes
// ----------------

export class AwsDynamo extends AwsBase<typeof DynamoDB> {
  public static async create(options: IAwsOptions) {
    return new AwsDynamo(options);
  }
  private constructor(options: IAwsOptions) {
    super(options);
  }

  protected onGetAws(options: any) {
    return new DynamoDB(options);
  }

  public async ensureTable(table: IAwsLambdaTable): Promise<void> {
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

  public async getItem(tableName: string, key: any, options?: IAwsLambdaGetOptions): Promise<any> {
    const dynamo = await this.getAws();
    const params: any = {
      TableName: this.getPrefixedName(tableName),
      Key: key,
    };

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      dynamo.getItem(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve(data.Item);
      });
    });
  }

  public async addItem(tableName: string, item: any, options?: IAwsLambdaAddOptions): Promise<any> {
    if (options && options.onCollision) {
      let tries = (options && options.collisionRetries) || defaultCollisionRetries;
      while (true) {
        try {
          await this.putItem(tableName, item, options);
          return item;
        } catch (error) {
          if (error.code !== alreadyExistsCode || tries < 0) {
            throw error;
          }
          const returnedItem = options.onCollision(item);
          if (returnedItem) {
            item = returnedItem;
          }
          tries--;
        }
      }
    }

    return this.putItem(tableName, item, options);
  }

  public async putItem(tableName: string, item: any, options?: IAwsLambdaPutOptions): Promise<any> {
    const dynamo = await this.getAws();
    const params: any = {
      TableName: this.getPrefixedName(tableName),
      Item: item,
      ReturnValues: options && options.returnOld ? 'ALL_OLD' : 'NONE',
    };

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      dynamo.putItem(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve(data.Attributes);
      });
    });
  }

  public async putAll(tableName: string, items: any[]): Promise<void> {
    items = items.slice();
    while (items.length) {
      const next = items.splice(0, 25);
      const unprocessed = await this.putBatch(tableName, next);
      items.unshift(...unprocessed);
    }
  }

  public async updateItem(tableName: string, key: any, options?: IAwsLambdaUpdateOptions): Promise<any> {
    const dynamo = await this.getAws();
    const params: any = {
      TableName: this.getPrefixedName(tableName),
      Key: key,
      ReturnValues: options && options.returnOld ? 'ALL_OLD' : 'NONE',
    };

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      dynamo.updateItem(params, (error: any, data: any) => {
        console.log(error);
        if (error) {
          return reject(error);
        }
        resolve(data.Attributes);
      });
    });
  }

  public async deleteItem(tableName: string, key: any, options?: IAwsLambdaDeleteOptions): Promise<any> {
    const dynamo = await this.getAws();
    const params: any = {
      TableName: this.getPrefixedName(tableName),
      Key: key,
      ReturnValues: options && options.returnOld ? 'ALL_OLD' : 'NONE',
    };

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      dynamo.deleteItem(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve(data.Attributes);
      });
    });
  }

  public async deleteAll(tableName: string, keys: any[]): Promise<void> {
    keys = keys.slice();
    while (keys.length) {
      const next = keys.splice(0, 25);
      const unprocessed = await this.deleteBatch(tableName, next);
      keys.unshift(...unprocessed);
    }
  }

  public async queryTable(tableName: string, options?: IAwsLambdaQueryOptions): Promise<IAwsLambdaItems> {
    const dynamo = await this.getAws();
    const params: any = {
      TableName: this.getPrefixedName(tableName),
      ScanIndexForward: options && options.scanForward === false ? false : true,
    };

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      dynamo.query(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const result: IAwsLambdaItems = {
          items: data.Items,
        };
        if (data.LastEvaluatedKey) {
          result.next = data.LastEvaluatedKey;
        }
        resolve(result);
      });
    });
  }

  public async scanTable(tableName: string, options?: IAwsLambdaScanOptions): Promise<IAwsLambdaItems> {
    const dynamo = await this.getAws();
    const params: any = {
      TableName: this.getPrefixedName(tableName),
    };

    applyOptions(options, params);

    return new Promise((resolve, reject) => {
      dynamo.scan(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const result: IAwsLambdaItems = {
          items: data.Items,
        };
        if (data.LastEvaluatedKey) {
          result.next = data.LastEvaluatedKey;
        }
        resolve(result);
      });
    });
  }

  public async deleteTable(name: string): Promise<void> {
    const dynamo = await this.getAws();
    const params = {
      TableName: this.getPrefixedName(name),
    };

    return new Promise((resolve, reject) => {
      dynamo.deleteTable(params, (error: any) => {
        if (error) {
          return reject(error);
        }

        dynamo.waitFor('tableNotExists', params, (error2: any) => {
          if (error2) {
            return reject(error2);
          }
          resolve();
        });
      });
    });
  }

  public async tableExists(name: string): Promise<boolean> {
    const dynamo = await this.getAws();
    const params = {
      TableName: this.getPrefixedName(name),
    };
    return new Promise((resolve, reject) => {
      dynamo.describeTable(params, (error: any, data: any) => {
        resolve(error === undefined || error === null);
      });
    });
  }

  private async waitForTable(name: string): Promise<void> {
    const dynamo = await this.getAws();
    const params = {
      TableName: this.getPrefixedName(name),
    };
    return new Promise((resolve, reject) => {
      dynamo.waitFor('tableExists', params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async putBatch(tableName: string, items: any[]): Promise<any[]> {
    const dynamo = await this.getAws();
    const params: any = { RequestItems: {} };
    tableName = this.getPrefixedName(tableName);
    params.RequestItems[tableName] = items.map(item => ({ PutRequest: { Item: item } }));

    return new Promise((resolve, reject) => {
      dynamo.batchWriteItem(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const unprocessed = data.UnprocessedItems[tableName];
        resolve(unprocessed ? unprocessed.map((item: any) => item.PutRequest.Item) : []);
      });
    });
  }

  private async deleteBatch(tableName: string, keys: any[]): Promise<any[]> {
    const dynamo = await this.getAws();
    const params: any = { RequestItems: {} };
    tableName = this.getPrefixedName(tableName);
    params.RequestItems[tableName] = keys.map(key => ({ DeleteRequest: { Key: key } }));

    return new Promise((resolve, reject) => {
      dynamo.batchWriteItem(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const unprocessed = data.UnprocessedItems[tableName];
        resolve(unprocessed ? unprocessed.map((key: any) => key.DeleteRequest.Key) : []);
      });
    });
  }

  private async updateTtl(name: string, attribute: string): Promise<void> {
    const dynamo = await this.getAws();
    const params = {
      TableName: this.getPrefixedName(name),
      TimeToLiveSpecification: {
        AttributeName: attribute,
        Enabled: true,
      },
    };

    return new Promise((resolve, reject) => {
      dynamo.updateTimeToLive(params, (error: any) => {
        if (error) {
          return reject(error);
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
          Key: 'deployment',
          Value: this.deployment.key,
        },
        {
          Key: 'account',
          Value: this.deployment.account,
        },
        {
          Key: 'region',
          Value: this.deployment.region.code,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      dynamo.tagResource(params, (error: any) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  private async createTable(table: IAwsLambdaTable): Promise<string> {
    const dynamo = await this.getAws();
    const params: any = {
      TableName: this.getPrefixedName(table.name),
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
          return reject(error);
        }

        resolve(data.TableDescription.TableArn);
      });
    });
  }

  protected getPrefixedName(name: string) {
    return `${this.deployment.key}.${name}`;
  }
}
