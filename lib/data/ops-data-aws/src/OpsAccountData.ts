import { DataSource } from '@5qtrs/data';
import { IOpsAccountData, IOpsAccount, IListOpsAccountOptions, IListOpsAccountResult } from '@5qtrs/ops-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { AccountTable } from './tables/AccountTable';
import { AccountIdTable } from './tables/AccountIdTable';

// ----------------
// Exported Classes
// ----------------

export class OpsAccountData extends DataSource implements IOpsAccountData {
  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    const accountIdTable = await AccountIdTable.create(config, dynamo);
    const accountTable = await AccountTable.create(config, dynamo);
    return new OpsAccountData(accountIdTable, accountTable);
  }
  private accountIdTable: AccountIdTable;
  private accountTable: AccountTable;

  private constructor(accountIdTable: AccountIdTable, accountTable: AccountTable) {
    super([accountIdTable, accountTable]);
    this.accountIdTable = accountIdTable;
    this.accountTable = accountTable;
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
}
