import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IIssuerPublicKey {
  keyId: string;
  publicKey: string;
}

export interface IIssuer {
  id: string;
  displayName?: string;
  jsonKeysUrl?: string;
  publicKeys?: IIssuerPublicKey[];
}

export interface IListIssuersOptions {
  next?: string;
  displayNameContains?: string;
  limit?: number;
}

export interface IListIssuersResult {
  next?: string;
  items: IIssuer[];
}

export interface IIssuerData extends IDataSource {
  add(accountId: string, issuer: IIssuer): Promise<IIssuer>;
  get(accountId: string, issuerId: string): Promise<IIssuer>;
  list(accountId: string, options?: IListIssuersOptions): Promise<IListIssuersResult>;
  update(accountId: string, issuer: IIssuer): Promise<IIssuer>;
  delete(accountId: string, issuerId: string): Promise<void>;
}
