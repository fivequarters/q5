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
