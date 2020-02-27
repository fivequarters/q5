export type Identity = {
  issuerId: string;
  subject: string;
};

export type Permission = {
  action: string;
  resource: string;
};

export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
  identities?: Identity[];
  access?: {
    allow: Permission[];
  };
};

export type Client = {
  id: string;
  displayName?: string;
  identities?: Identity[];
  access?: {
    allow: Permission[];
  };
};

export type Agent = User | Client;

export type PublicKey = {
  keyId: string;
  publicKey: string;
};

export type Issuer = {
  id: string;
  displayName?: string;
  publicKeys?: PublicKey[];
  jsonKeysUrl?: string;
  publicKeyAcquisition?: "pki" | "jwks";
  jsonKeysUrlError?: string;
  idError?: string;
};

export type Resource = {
  accountId?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
  userId?: string;
  clientId?: string;
  issuerId?: string;
};

export type Subscription = {
  id: string;
  displayName?: string;
};

export type Subscriptions = {
  list: Subscription[];
  hash: { [key: string]: Subscription };
};

export type FunctionListItem = {
  boundaryId: string;
  functionId: string;
  cron?: string;
};

export type BoundaryListItem = {
  boundaryId: string;
  functions: FunctionListItem[];
};

export type BoundaryHash = {
  [key: string]: BoundaryListItem;
};
