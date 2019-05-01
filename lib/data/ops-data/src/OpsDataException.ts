import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum OpsDataExceptionCode {
  noAccountName = 'noAccountName',
  noAccountId = 'noAccountId',
  noDomain = 'noDomain',
  noNetwork = 'noNetwork',
  accountNameAlreadyExists = 'accountNameAlreadyExists',
  accountIdAlreadyExists = 'accountAlreadyExists',
  domainAlreadyExists = 'domainAlreadyExists',
  networkAlreadyExists = 'networkAlreadyExists',
  configNotProvided = 'configNotProvided',
}

// ----------------
// Exported Classes
// ----------------

export class OpsDataException extends Exception {
  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }

  public static noAccountId(accountId: string) {
    const message = `The AWS account with account id '${accountId}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noAccountId, message, [accountId]);
  }

  public static noAccountName(accountName: string) {
    const message = `The AWS account with account name '${accountName}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noAccountId, message, [accountName]);
  }

  public static noDomain(domainName: string) {
    const message = `The domain '${domainName}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noDomain, message, [domainName]);
  }

  public static noNetwork(networkName: string) {
    const message = `The network '${networkName}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noNetwork, message, [networkName]);
  }

  public static accountIdAlreadyExists(accountId: string) {
    const message = `The AWS account with account id '${accountId}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.accountIdAlreadyExists, message, [accountId]);
  }

  public static accountNameAlreadyExists(accountName: string) {
    const message = `The AWS account with account name '${accountName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.accountNameAlreadyExists, message, [accountName]);
  }

  public static domainAlreadyExists(domainName: string) {
    const message = `The domain '${domainName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.domainAlreadyExists, message, [domainName]);
  }

  public static networkAlreadyExists(networkName: string) {
    const message = `The network '${networkName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.domainAlreadyExists, message, [networkName]);
  }

  public static configNotProvided(configName: string) {
    const message = `A value for the the config setting '${configName}' was not provided`;
    return new OpsDataException(OpsDataExceptionCode.configNotProvided, message, [configName]);
  }
}
