import { IDataSource } from '@5qtrs/data';
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

  protected constructor(table: IAwsDynamoTable, dynamo: AwsDynamo) {
    this.table = table;
    this.dynamo = dynamo;
  }

  public async isSetup() {
    return this.dynamo.tableExists(this.table.name);
  }

  public async setup() {
    return this.dynamo.ensureTable(this.table);
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
