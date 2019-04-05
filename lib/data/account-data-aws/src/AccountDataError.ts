export enum AccountDataErrorCode {
  noAccount = 'noAccount',
  noSubscription = 'noSubscription',
  databaseError = 'databaseError',
}

export class AccountDataError extends Error {
  private entityProp: string;
  private codeProp: AccountDataErrorCode;

  private constructor(entity: string, code: AccountDataErrorCode, message?: string) {
    super(message);
    this.entityProp = entity;
    this.codeProp = code;
  }

  public static noAccount(id: string) {
    const message = `The '${id}' account does not exist`;
    return new AccountDataError(id, AccountDataErrorCode.noAccount, message);
  }

  public static noSubscription(id: string) {
    const message = `The '${id}' subscription does not exist`;
    return new AccountDataError(id, AccountDataErrorCode.noSubscription, message);
  }

  public static databaseError(entity: string, action: string, error: Error) {
    const message = `Unable to perform action '${action}' on entity ${entity} due to the following error: '${
      error.message
    }'`;
    return new AccountDataError(entity, AccountDataErrorCode.databaseError, message);
  }

  public get entity() {
    return this.entityProp;
  }

  public get code() {
    return this.codeProp;
  }
}
