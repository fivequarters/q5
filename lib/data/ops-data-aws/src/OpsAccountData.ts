import { DataSource } from '@5qtrs/data';
import {
  IOpsAccountData,
  IOpsAccount,
  IListOpsAccountOptions,
  IListOpsAccountResult,
  OpsDataException,
  OpsDataExceptionCode,
} from '@5qtrs/ops-data';
import { OpsDataTables } from './OpsDataTables';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsAccountData extends DataSource implements IOpsAccountData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    return new OpsAccountData(config, tables);
  }
  private config: OpsDataAwsConfig;
  private tables: OpsDataTables;

  private constructor(config: OpsDataAwsConfig, tables: OpsDataTables) {
    super([]);
    this.config = config;
    this.tables = tables;
  }

  public async isSetup(): Promise<boolean> {
    return this.exists(this.getMainAccount());
  }

  public async setup(): Promise<void> {
    await this.add(this.getMainAccount());
  }

  public async exists(account: IOpsAccount): Promise<boolean> {
    try {
      const existing = await this.tables.accountTable.get(account.name);
      if (existing.id !== account.id) {
        throw OpsDataException.accountDifferentId(account.name, existing.id);
      }
      if (existing.role !== account.role) {
        throw OpsDataException.accountDifferentRole(account.name, existing.role);
      }
      return true;
    } catch (error) {
      if (error.code === OpsDataExceptionCode.noAccountName) {
        return false;
      }
      throw error;
    }
  }

  public async add(account: IOpsAccount): Promise<void> {
    await this.tables.accountIdTable.add(account);
    await this.tables.accountTable.add(account);
  }

  public async get(accountName: string): Promise<IOpsAccount> {
    return this.tables.accountTable.get(accountName);
  }

  public async list(options?: IListOpsAccountOptions): Promise<IListOpsAccountResult> {
    return this.tables.accountTable.list(options);
  }

  public async listAll(): Promise<IOpsAccount[]> {
    return this.tables.accountTable.listAll();
  }

  private getMainAccount(): IOpsAccount {
    return {
      id: this.config.mainAccountId,
      name: this.config.mainAccountName,
      role: this.config.mainAccountRole || '',
    };
  }
}
