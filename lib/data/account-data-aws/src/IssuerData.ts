import { DataSource } from '@5qtrs/data';
import { IIssuer, IIssuerData, IListIssuersOptions, IListIssuersResult } from '@5qtrs/account-data';
import { AccountDataTables } from './AccountDataTables';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';
import { IssuerTable } from './tables/IssuerTable';

// ----------------
// Exported Classes
// ----------------

export class IssuerData extends DataSource implements IIssuerData {
  public static async create(config: AccountDataAwsConfig, tables: AccountDataTables) {
    return new IssuerData(tables.issuerTable);
  }
  private issuerTable: IssuerTable;

  private constructor(issuerTable: IssuerTable) {
    super([issuerTable]);
    this.issuerTable = issuerTable;
  }

  public async add(accountId: string, issuer: IIssuer): Promise<IIssuer> {
    await this.issuerTable.add(accountId, issuer);
    return issuer;
  }

  public async get(accountId: string, issuerId: string): Promise<IIssuer> {
    return this.issuerTable.get(accountId, issuerId);
  }

  public async list(accountId: string, options?: IListIssuersOptions): Promise<IListIssuersResult> {
    return this.issuerTable.list(accountId, options);
  }

  public async update(accountId: string, issuer: IIssuer): Promise<IIssuer> {
    return this.issuerTable.update(accountId, issuer);
  }

  public async delete(accountId: string, issuerId: string): Promise<void> {
    return this.issuerTable.delete(accountId, issuerId);
  }
}
