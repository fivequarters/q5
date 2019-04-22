import { cancelOnError } from '@5qtrs/promise';
import {
  IAccountDataContext,
  IIssuer,
  IListIssuersOptions,
  IListIssuersResult,
  AccountDataException,
} from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';
import { ResolvedAgent } from './ResolvedAgent';

// ------------------
// Internal Functions
// ------------------

function validateIssuer(issuer: IIssuer) {
  if (issuer.publicKeys && issuer.publicKeys.length > 3) {
    throw AccountDataException.issuerTooManyKeys(issuer.id);
  }

  if (issuer.publicKeys && issuer.publicKeys.length) {
    if (issuer.jsonKeysUrl) {
      throw AccountDataException.issuerJsonKeyUriAndPublicKeys(issuer.id);
    }
    for (const publicKey of issuer.publicKeys) {
      if (publicKey.keyId === undefined) {
        throw AccountDataException.issuerMissingKeyId(issuer.id);
      }
      if (publicKey.publicKey === undefined) {
        throw AccountDataException.issuerMissingPublicKey(issuer.id);
      }
    }
  } else if (!issuer.jsonKeysUrl) {
    throw AccountDataException.issuerMissingJsonKeyUriAndPublicKeys(issuer.id);
  }
}

// ----------------
// Exported Classes
// ----------------

export class Issuer {
  private config: AccountConfig;
  private dataContext: IAccountDataContext;

  private constructor(config: AccountConfig, dataContext: IAccountDataContext) {
    this.config = config;
    this.dataContext = dataContext;
  }

  public static async create(config: AccountConfig, dataContext: IAccountDataContext) {
    return new Issuer(config, dataContext);
  }

  public async add(resolvedAgent: ResolvedAgent, accountId: string, issuer: IIssuer): Promise<IIssuer> {
    validateIssuer(issuer);
    await this.dataContext.accountData.get(accountId);
    return this.dataContext.issuerData.add(accountId, issuer);
  }

  public async get(resolvedAgent: ResolvedAgent, accountId: string, issuerId: string): Promise<IIssuer> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const issuerPromise = this.dataContext.issuerData.get(accountId, issuerId);
    return cancelOnError(accountPromise, issuerPromise);
  }

  public async list(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    options?: IListIssuersOptions
  ): Promise<IListIssuersResult> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const issuerPromise = this.dataContext.issuerData.list(accountId, options);
    return cancelOnError(accountPromise, issuerPromise);
  }

  public async update(resolvedAgent: ResolvedAgent, accountId: string, issuer: IIssuer): Promise<IIssuer> {
    validateIssuer(issuer);
    const accountPromise = this.dataContext.accountData.get(accountId);
    const issuerPromise = this.dataContext.issuerData.update(accountId, issuer);
    return cancelOnError(accountPromise, issuerPromise);
  }

  public async delete(resolvedAgent: ResolvedAgent, accountId: string, issuerId: string): Promise<void> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const issuerPromise = this.dataContext.issuerData.delete(accountId, issuerId);
    return cancelOnError(accountPromise, issuerPromise);
  }
}
