import { DataSource } from '@5qtrs/data';
import { IAuditData, IAuditEntry, IListAuditEntriesOptions, IListAuditEntriesResult } from '@5qtrs/account-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';
import { AuditEntryTable } from './tables/AuditEntryTable';

// ----------------
// Exported Classes
// ----------------

export class AuditData extends DataSource implements IAuditData {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    const auditEntryTable = await AuditEntryTable.create(config, dynamo);
    return new AuditData(auditEntryTable);
  }

  private auditEntryTable: AuditEntryTable;

  private constructor(auditEntryTable: AuditEntryTable) {
    super([auditEntryTable]);
    this.auditEntryTable = auditEntryTable;
  }

  public async add(auditEntry: IAuditEntry): Promise<void> {
    return this.auditEntryTable.add(auditEntry);
  }

  public async list(accountId: string, options: IListAuditEntriesOptions): Promise<IListAuditEntriesResult> {
    return this.auditEntryTable.list(accountId, options);
  }
}
