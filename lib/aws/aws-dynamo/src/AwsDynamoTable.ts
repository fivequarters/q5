import { IDataSource } from '@5qtrs/data';
import { avoidRace } from '@5qtrs/promise';
import {
  AwsDynamo,
  IAwsDynamoAllOptions,
  IAwsDynamoGetAllOptions,
  IAwsDynamoGetOptions,
  IAwsDynamoItems,
  IAwsDynamoQueryOptions,
  IAwsDynamoScanOptions,
  IAwsDynamoSetOptions,
  IAwsDynamoTable,
  IAwsDynamoUpdateOptions,
} from './AwsDynamo';

// ----------------
// Exported Classes
// ----------------

export class AwsDynamoTable implements IDataSource {
  private table: IAwsDynamoTable;
  private dynamo: AwsDynamo;
  private setupRaceFree: () => Promise<void>;

  protected constructor(table: IAwsDynamoTable, dynamo: AwsDynamo) {
    this.table = table;
    this.dynamo = dynamo;
    this.setupRaceFree = () => this.dynamo.ensureTable(this.table);
  }

  public async isSetup() {
    const description = await this.dynamo.tableExists(this.table.name);
    let result = !!(
      description &&
      (!description.SSEDescription ||
        description.SSEDescription.Status === 'DISABLED' ||
        description.SSEDescription.Status === 'DISABLING')
    );
    if (result && this.table.globalIndexes) {
      const globalIndexes = ((description && description.GlobalSecondaryIndexes) || []).reduce(
        (previous: any, current: any) => {
          previous[current.IndexName] = current.IndexStatus;
          return previous;
        },
        {}
      );
      for (let i = 0; i < this.table.globalIndexes.length; i++) {
        if (
          !globalIndexes[this.table.globalIndexes[i].name] ||
          globalIndexes[this.table.globalIndexes[i].name] === 'DELETING'
        ) {
          result = false;
          break;
        }
      }
    }
    return result;
  }

  public async setup() {
    return this.setupRaceFree();
  }

  protected async getItem(key: any, options?: IAwsDynamoGetOptions): Promise<any> {
    return this.dynamo.getItem(this.table, key, options);
  }

  protected async getAllItems(keys: any[], options?: IAwsDynamoGetAllOptions): Promise<any[]> {
    return this.dynamo.getAllItems(this.table, keys, options);
  }

  protected async addItem(item: any, options?: IAwsDynamoSetOptions): Promise<void> {
    return this.dynamo.addItem(this.table, item, options);
  }

  protected async putItem(item: any, options?: IAwsDynamoSetOptions): Promise<void> {
    return this.dynamo.putItem(this.table, item, options);
  }

  protected async putAllItems(items: any[], options?: IAwsDynamoAllOptions): Promise<void> {
    return this.dynamo.putAllItems(this.table, items, options);
  }

  protected async updateItem(key: any, options?: IAwsDynamoUpdateOptions): Promise<any> {
    return this.dynamo.updateItem(this.table, key, options);
  }

  protected async archiveItem(key: any, options?: IAwsDynamoSetOptions): Promise<void> {
    return this.dynamo.archiveItem(this.table, key, options);
  }

  protected async unarchiveItem(key: any, options?: IAwsDynamoSetOptions): Promise<void> {
    return this.dynamo.unarchiveItem(this.table, key, options);
  }

  protected async deleteItem(key: any, options?: IAwsDynamoSetOptions): Promise<void> {
    return this.dynamo.deleteItem(this.table, key, options);
  }

  protected async deleteAllItems(keys: any[], options?: IAwsDynamoAllOptions): Promise<void> {
    return this.dynamo.deleteAllItems(this.table, keys, options);
  }

  protected async queryTable(options?: IAwsDynamoQueryOptions): Promise<IAwsDynamoItems> {
    return this.dynamo.queryTable(this.table, options);
  }

  protected async scanTable(options?: IAwsDynamoScanOptions): Promise<IAwsDynamoItems> {
    return this.dynamo.scanTable(this.table, options);
  }
}
