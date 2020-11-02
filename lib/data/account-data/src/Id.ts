// ------------------
// Internal Constants
// ------------------

const accountPrefix = 'acc';
const subscriptionPrefix = 'sub';
const userPrefix = 'usr';
const clientPrefix = 'clt';
const systemPrefix = 'system';

const idPrefixes: { [index: string]: string } = {
  account: accountPrefix,
  subscription: subscriptionPrefix,
  user: userPrefix,
  client: clientPrefix,
  system: systemPrefix,
};

// -------------------
// Exported Interfaces
// -------------------

export enum IdType {
  account = 'account',
  subscription = 'subscription',
  user = 'user',
  client = 'client',
  system = 'system',
}

// ----------------
// Exported Classes
// ----------------

export class Id {
  public static getIdPrefix(idType: IdType): string | undefined {
    return idPrefixes[idType] || undefined;
  }

  public static getIdType(id: string): IdType | undefined {
    for (const idType in idPrefixes) {
      if (idType) {
        const prefix = idPrefixes[idType];
        if (id.indexOf(prefix) === 0) {
          return idType as IdType;
        }
      }
    }
    return undefined;
  }
}
