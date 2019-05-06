import { DataSource } from '@5qtrs/data';
import {
  IOpsAccountData,
  IOpsAccount,
  IListOpsAccountOptions,
  IListOpsAccountResult,
  OpsDataException,
  OpsDataExceptionCode,
} from '@5qtrs/ops-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { AccountTable } from './tables/AccountTable';
import { AccountIdTable } from './tables/AccountIdTable';

// ----------------
// Exported Classes
// ----------------

export class OpsAccountData extends DataSource implements IOpsAccountData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const awsConfig = await provider.getAwsConfigForMain();
    const dynamo = await AwsDynamo.create(awsConfig);
    const accountIdTable = await AccountIdTable.create(config, dynamo);
    const accountTable = await AccountTable.create(config, dynamo);
    return new OpsAccountData(accountIdTable, accountTable, config);
  }
  private accountIdTable: AccountIdTable;
  private accountTable: AccountTable;
  private config: OpsDataAwsConfig;

  private constructor(accountIdTable: AccountIdTable, accountTable: AccountTable, config: OpsDataAwsConfig) {
    super([accountIdTable, accountTable]);
    this.accountIdTable = accountIdTable;
    this.accountTable = accountTable;
    this.config = config;
  }

  public async isSetup(): Promise<boolean> {
    const superIsSetup = await super.isSetup();
    return superIsSetup ? await this.exists(this.getMainAccount()) : false;
  }

  public async setup(): Promise<void> {
    await super.setup();
    await this.add(this.getMainAccount());
  }

  public async exists(account: IOpsAccount): Promise<boolean> {
    try {
      const existing = await this.accountTable.get(account.name);
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
    await this.accountIdTable.add(account);
    await this.accountTable.add(account);
  }

  public async get(accountName: string): Promise<IOpsAccount> {
    return this.accountTable.get(accountName);
  }

  public async list(options?: IListOpsAccountOptions): Promise<IListOpsAccountResult> {
    return this.accountTable.list(options);
  }

  public async listAll(): Promise<IOpsAccount[]> {
    return this.accountTable.listAll();
  }

  private getMainAccount(): IOpsAccount {
    return {
      id: this.config.mainAccountId,
      name: this.config.mainAccountName,
      role: this.config.mainAccountRole || '',
    };
  }
}
