import { Id } from './Id';
import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum AccountDataExceptionCode {
  noAccount = 'noAccount',
  noSubscription = 'noSubscription',
  noInitEntry = 'noInitEntry',
  noClient = 'noClient',
  noUser = 'noUser',
  noIssuer = 'noIssuer',
  noIdentity = 'noIdentity',
  noAgent = 'noAgent',
  accountAlreadyExists = 'accountAlreadyExists',
  subscriptionAlreadyExists = 'subscriptionAlreadyExists',
  clientAlreadyExists = 'clientAlreadyExists',
  userAlreadyExists = 'userAlreadyExists',
  issuerAlreadyExists = 'issuerAlreadyExists',
  identityAlreadyExists = 'identityAlreadyExists',
  idRequired = 'idRequired',
  unauthorized = 'unauthorized',
  unauthorizedToGrantAccess = 'unauthorizedToGrantAccess',
  invalidJwt = 'invalidJwt',
  noPublicKey = 'noPublicKey',
  invalidNext = 'invalidNext',
  invalidFilterDate = 'invalidFilterDate',
  invalidFilterDateOrder = 'invalidFilterDateOrder',
  invalidFilterIdentity = 'invalidFilterIdentity',
  issuerTooManyKeys = 'issuerTooManyKeys',
  issuerEmptyPublicKeys = 'issuerEmptyPublicKeys',
  issuerMissingKeyId = 'issuerMissingKeyId',
  issuerMissingPublicKey = 'issuerMissingPublicKey',
  issuerJsonKeyUriAndPublicKeys = 'issuerJsonKeyUriAndPublicKeys',
  issuerMissingJsonKeyUriAndPublicKeys = 'issuerMissingJsonKeyUriAndPublicKeys',
  configNotProvided = 'configNotProvided',
}

// ----------------
// Exported Classes
// ----------------

export class AccountDataException extends Exception {
  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }

  public static noAccount(accountId: string) {
    const message = `The account '${accountId}' does not exist`;
    return new AccountDataException(AccountDataExceptionCode.noAccount, message, [accountId]);
  }

  public static noSubscription(subscriptionId: string) {
    const message = `The subscription '${subscriptionId}' does not exist`;
    return new AccountDataException(AccountDataExceptionCode.noSubscription, message, [subscriptionId]);
  }

  public static noInitEntry(agentId: string) {
    const agentType = Id.getIdType(agentId) || '<unknown id type>';
    const message = `There is no outstanding initialization entry for ${agentType} '${agentId}'`;
    return new AccountDataException(AccountDataExceptionCode.noInitEntry, message, [agentId]);
  }

  public static noIdentity(issuer: string, subject: string) {
    const message = `The identity with issuer '${issuer}' and subject '${subject}' is not associated with any user`;
    return new AccountDataException(AccountDataExceptionCode.noIdentity, message, [issuer, subject]);
  }

  public static noIssuer(issuerId: string) {
    const message = `The issuer '${issuerId}' is not associated with the account`;
    return new AccountDataException(AccountDataExceptionCode.noIssuer, message, [issuerId]);
  }

  public static noAgent(agentId: string) {
    const agentType = Id.getIdType(agentId) || '<unknown id type>';
    const errorCode = agentType === 'user' ? AccountDataExceptionCode.noUser : AccountDataExceptionCode.noClient;
    const message = `The ${agentType} '${agentId}' does not exist`;
    return new AccountDataException(errorCode, message, [agentId]);
  }

  public static accountAlreadyExists(accountId: string) {
    const message = `The account '${accountId}' already exists`;
    return new AccountDataException(AccountDataExceptionCode.accountAlreadyExists, message, [accountId]);
  }

  public static subscriptionAlreadyExists(subscriptionId: string) {
    const message = `The subscription '${subscriptionId}' already exists`;
    return new AccountDataException(AccountDataExceptionCode.subscriptionAlreadyExists, message, [subscriptionId]);
  }

  public static agentAlreadyExists(agentId: string) {
    const agentType = Id.getIdType(agentId) || '<unknown id type>';
    const errorCode = agentType === 'user' ? AccountDataExceptionCode.noUser : AccountDataExceptionCode.noClient;
    const message = `The ${agentType} '${agentId}' already exists`;
    return new AccountDataException(errorCode, message, [agentId]);
  }

  public static issuerAlreadyExists(issuerId: string) {
    const message = `The issuer '${issuerId}' already exists`;
    return new AccountDataException(AccountDataExceptionCode.issuerAlreadyExists, message, [issuerId]);
  }

  public static identityAlreadyExists(issuer: string, subject: string) {
    const message = `The identity with issuer '${issuer}' and subject '${subject}' is already associated with a user or client`;
    return new AccountDataException(AccountDataExceptionCode.identityAlreadyExists, message, [issuer, subject]);
  }

  public static idRequired(entity: string, action: string) {
    const message = `The '${entity}' must have an id to perform the '${action}' action`;
    return new AccountDataException(AccountDataExceptionCode.idRequired, message, [entity, action]);
  }

  public static unauthorized(agentId: string, action: string, resource: string) {
    const agentType = Id.getIdType(agentId) || '<unknown id type>';
    const message = [
      `The ${agentType} '${agentId}' is not authorized to`,
      `perform action '${action}' on resource '${resource}'`,
    ].join(' ');
    return new AccountDataException(AccountDataExceptionCode.unauthorized, message, [agentId, action, resource]);
  }

  public static unauthorizedToGrantAccess(agentId: string, action: string, resource: string) {
    const agentType = Id.getIdType(agentId) || '<unknown id type>';
    const message = [
      `The ${agentType} '${agentId}' is not authorized to grant access`,
      `to perform the action '${action}' on resource '${resource}'`,
    ].join(' ');
    return new AccountDataException(AccountDataExceptionCode.unauthorizedToGrantAccess, message, [
      agentId,
      action,
      resource,
    ]);
  }

  public static invalidJwt(error: Error) {
    const message = `The JWT could not be validated due to the following error: '${error.message}'`;
    return new AccountDataException(AccountDataExceptionCode.invalidJwt, message, undefined, error);
  }

  public static invalidFilterDate(type: string, value: string) {
    const message = [
      `The '${type}' filter date/time '${value}' is invalid.`,
      "Specify an absolute date/time, or a relative time such as '-15m', '-2h', or '-6d'",
    ].join(' ');
    return new AccountDataException(AccountDataExceptionCode.invalidFilterDate, message, [type, value]);
  }

  public static invalidFilterDateOrder(from: Date, to: Date) {
    const message = [
      `The 'to' filter date/time '${to.toISOString()}' must be later in time`,
      `than the 'from' filter date/time of '${from.toISOString()}'`,
    ].join(' ');
    return new AccountDataException(AccountDataExceptionCode.invalidFilterDateOrder, message, [from, to]);
  }

  public static invalidFilterIdentity(subject: string) {
    const message = `The 'subject' filter '${subject}' can not be specified without the 'issuerId' filter`;
    return new AccountDataException(AccountDataExceptionCode.invalidFilterIdentity, message, [subject]);
  }

  public static noPublicKey(keyId: string) {
    const message = `The public key with key id '${keyId}' does not exist`;
    return new AccountDataException(AccountDataExceptionCode.noPublicKey, message, [keyId]);
  }

  public static invalidNext(next: string, error?: Error) {
    const message = `The next value '${next}' is invalid`;
    return new AccountDataException(AccountDataExceptionCode.invalidNext, message, [next], error);
  }

  public static issuerTooManyKeys(issuerId: string) {
    const message = `The issuer '${issuerId}' can only have 3 public keys`;
    return new AccountDataException(AccountDataExceptionCode.issuerTooManyKeys, message, [issuerId]);
  }

  public static issuerEmptyPublicKeys(issuerId: string) {
    const message = `The issuer '${issuerId}' can not have an empty array of public keys`;
    return new AccountDataException(AccountDataExceptionCode.issuerEmptyPublicKeys, message, [issuerId]);
  }

  public static issuerMissingKeyId(issuerId: string) {
    const message = `The issuer '${issuerId}' is missing the key id for one or more public keys`;
    return new AccountDataException(AccountDataExceptionCode.issuerMissingKeyId, message, [issuerId]);
  }

  public static issuerMissingPublicKey(issuerId: string) {
    const message = `The issuer '${issuerId}' is missing the one or more public keys`;
    return new AccountDataException(AccountDataExceptionCode.issuerTooManyKeys, message, [issuerId]);
  }

  public static issuerJsonKeyUriAndPublicKeys(issuerId: string) {
    const message = `The issuer '${issuerId}' can not have both public keys and a json keys URL`;
    return new AccountDataException(AccountDataExceptionCode.issuerJsonKeyUriAndPublicKeys, message, [issuerId]);
  }

  public static issuerMissingJsonKeyUriAndPublicKeys(issuerId: string) {
    const message = `The issuer '${issuerId}' must have at least one public key or a json keys URL`;
    return new AccountDataException(AccountDataExceptionCode.issuerMissingJsonKeyUriAndPublicKeys, message, [issuerId]);
  }

  public static configNotProvided(configName: string) {
    const message = `A value for the the config setting '${configName}' was not provided`;
    return new AccountDataException(AccountDataExceptionCode.configNotProvided, message, [configName]);
  }
}
