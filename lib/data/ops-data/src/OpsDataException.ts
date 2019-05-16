import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum OpsDataExceptionCode {
  noAccountName = 'noAccountName',
  noAccountId = 'noAccountId',
  noDomain = 'noDomain',
  noNetwork = 'noNetwork',
  noDeployment = 'noDeployment',
  noStack = 'noStack',
  invalidDomainName = 'invalidDomainName',
  accountDifferentId = 'accountDifferentId',
  accountDifferentRole = 'accountDifferentRole',
  accountNameAlreadyExists = 'accountNameAlreadyExists',
  accountIdAlreadyExists = 'accountAlreadyExists',
  domainDifferentAccount = 'domainDifferentAccount',
  domainAlreadyExists = 'domainAlreadyExists',
  networkDifferentAccount = 'networkDifferentAccount',
  networkDifferentRegion = 'networkDifferentRegion',
  networkAlreadyExists = 'networkAlreadyExists',
  deploymentDifferentDomain = 'deploymentDifferentDomain',
  deploymentDifferentNetwork = 'deploymentDifferentNetwork',
  deploymentAlreadyExists = 'deploymentAlreadyExists',
  stackAlreadyExists = 'stackAlreadyExists',
  configNotProvided = 'configNotProvided',
  demoteLastStackNotAllowed = 'demoteLastStackNotAllowed',
  removeActiveStackNotAllowed = 'removeActiveStackNotAllowed',
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
    return new OpsDataException(OpsDataExceptionCode.noAccountName, message, [accountName]);
  }

  public static noDomain(domainName: string) {
    const message = `The domain '${domainName}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noDomain, message, [domainName]);
  }

  public static noNetwork(networkName: string) {
    const message = `The network '${networkName}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noNetwork, message, [networkName]);
  }

  public static noDeployment(deploymentName: string) {
    const message = `The deployment '${deploymentName}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noDeployment, message, [deploymentName]);
  }

  public static noStack(stackId: number, deploymentName: string) {
    const message = `The stack '${stackId}' for '${deploymentName}' does not exist`;
    return new OpsDataException(OpsDataExceptionCode.noStack, message, [stackId, deploymentName]);
  }

  public static invalidDomainName(domainName: string) {
    const message = `The domain name '${domainName}' is invalid`;
    return new OpsDataException(OpsDataExceptionCode.invalidDomainName, message, [domainName]);
  }

  public static accountDifferentId(accountName: string, accountId: string) {
    const message = [
      `An account with the name '${accountName}' already exists`,
      `but it has an AWS account id of '${accountId}'`,
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.accountDifferentId, message, [accountName, accountId]);
  }

  public static accountDifferentRole(accountName: string, role: string) {
    const message = [
      `An account with the name '${accountName}' already exists`,
      `but it has a role of '${role || '<none>'}'`,
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.accountDifferentRole, message, [accountName, role]);
  }

  public static accountIdAlreadyExists(accountId: string) {
    const message = `The AWS account with account id '${accountId}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.accountIdAlreadyExists, message, [accountId]);
  }

  public static accountNameAlreadyExists(accountName: string) {
    const message = `The AWS account with account name '${accountName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.accountNameAlreadyExists, message, [accountName]);
  }

  public static domainDifferentAccount(domainName: string, accountName: string) {
    const message = [
      `A domain with the name '${domainName}' already exists`,
      `but it has an account name of '${accountName}'`,
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.domainDifferentAccount, message, [domainName, accountName]);
  }

  public static domainAlreadyExists(domainName: string) {
    const message = `The domain '${domainName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.domainAlreadyExists, message, [domainName]);
  }

  public static networkDifferentAccount(networkName: string, accountName: string) {
    const message = [
      `A network with the name '${networkName}' already exists`,
      `but it has an account name of '${accountName}'`,
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.networkDifferentAccount, message, [networkName, accountName]);
  }

  public static networkDifferentRegion(networkName: string, region: string) {
    const message = [
      `A network with the name '${networkName}' already exists`,
      `but it has a region of '${region}'`,
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.networkDifferentRegion, message, [networkName, region]);
  }

  public static networkAlreadyExists(networkName: string) {
    const message = `The network '${networkName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.domainAlreadyExists, message, [networkName]);
  }

  public static deploymentDifferentDomain(deploymentName: string, domainName: string) {
    const message = [
      `A deployment with the name '${deploymentName}' already exists`,
      `but it has a domain of '${domainName}'`,
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.deploymentDifferentDomain, message, [deploymentName, domainName]);
  }

  public static deploymentDifferentNetwork(deploymentName: string, networkName: string) {
    const message = [
      `A deployment with the name '${deploymentName}' already exists`,
      `but it has a network of '${networkName}'`,
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.deploymentDifferentDomain, message, [deploymentName, networkName]);
  }

  public static deploymentAlreadyExists(deploymentName: string) {
    const message = `The deployment '${deploymentName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.deploymentAlreadyExists, message, [deploymentName]);
  }

  public static stackAlreadyExists(stackId: number, deploymentName: string) {
    const message = `The stack '${stackId}' for '${deploymentName}' already exists`;
    return new OpsDataException(OpsDataExceptionCode.stackAlreadyExists, message, [stackId, deploymentName]);
  }

  public static configNotProvided(configName: string) {
    const message = `A value for the the config setting '${configName}' was not provided`;
    return new OpsDataException(OpsDataExceptionCode.configNotProvided, message, [configName]);
  }

  public static demoteLastStackNotAllowed(deploymentName: string, id: number) {
    const message = [
      `The stack '${id}' is the last active stack of deployment '${deploymentName}'`,
      "and can not be demoted without the 'force' option",
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.demoteLastStackNotAllowed, message, [id, deploymentName]);
  }

  public static removeActiveStackNotAllowed(deploymentName: string, id: number) {
    const message = [
      `The stack '${id}' is an active stack of deployment '${deploymentName}'`,
      "and can not be removed without the 'force' option",
    ].join(' ');
    return new OpsDataException(OpsDataExceptionCode.removeActiveStackNotAllowed, message, [id, deploymentName]);
  }
}
