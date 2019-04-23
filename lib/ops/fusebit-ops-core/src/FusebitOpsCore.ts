import { FusebitOpsDotConfig, AwsAccountType, IAwsUser } from './FusebitOpsDotConfig';
import { AwsCreds, IMfaCodeResolver as IFusebitOpsMfaCodeResolver } from '@5qtrs/aws-cred';
import {
  OpsCoreAws,
  IOpsAwsAccount as IFusebitOpsAccount,
  IOpsAwsNetwork as IFusebitOpsNetwork,
  IOpsAwsDomain as IFusebitOpsDomain,
} from '@5qtrs/ops-core-aws';

import {
  OpsDeployAws,
  IOpsAwsDeployment as IFusebitOpsDeployment,
  IOpsAwsDeploymentDetails as IFusebitOpsDeploymentDetails,
  IOpsAwsDeploymentDetailsList as IFusebitOpsDeploymentDetailsList,
} from '@5qtrs/ops-deploy-aws';

import { OpsPublishAws, IOpsAwsPublishDetails as IFusebitOpsPublishDetails } from '@5qtrs/ops-publish-aws';
import { OpsApiAws } from '@5qtrs/ops-api-aws';
import { OpsAccountAws } from '@5qtrs/ops-account-aws';
import { OpsUserAws } from '@5qtrs/ops-user-aws';

export {
  IOpsAwsPublishDetails as IFusebitOpsPublishDetails,
  IOpsAwsPublishDetailsList as IFusebitOpsPublishDetailsList,
} from '@5qtrs/ops-publish-aws';

export {
  IOpsAwsDeployment as IFusebitOpsDeployment,
  IOpsAwsDeploymentDetails as IFusebitOpsDeploymentDetails,
  IOpsAwsDeploymentDetailsList as IFusebitOpsDeploymentDetailsList,
} from '@5qtrs/ops-deploy-aws';

export {
  IOpsAwsAccount as IFusebitOpsAccount,
  IOpsAwsNetwork as IFusebitOpsNetwork,
  IOpsAwsDomain as IFusebitOpsDomain,
} from '@5qtrs/ops-core-aws';
export { IMfaCodeResolver as IFusebitOpsMfaCodeResolver } from '@5qtrs/aws-cred';

import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

// ------------------
// Internal Constants
// ------------------

const mainProdRole = 'main';

// -------------------
// Internal Interfaces
// -------------------

interface IFusebitDeployment {
  [index: string]: OpsApiAws;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitOpsCoreSettings {
  awsProdAccount?: string;
  awsUserAccount?: string;
  awsProdRole?: string;
  awsUserName?: string;
  awsUserSecretAccessKey?: string;
  awsUserAccessKeyId?: string;
}

export interface IFusebitOpsLogEntry {
  error?: Error;
  message?: string;
}

// ----------------
// Exported Classes
// ----------------

export class FusebitOpsCore {
  private dotConfig: FusebitOpsDotConfig;
  private fusebitDeployment?: IFusebitDeployment;
  private mfaCodeResolver?: IFusebitOpsMfaCodeResolver;
  private opsDeploy?: OpsDeployAws;
  private opsPublish?: OpsPublishAws;
  private opsCore?: OpsCoreAws;
  private userCreds?: AwsCreds;
  private log: IFusebitOpsLogEntry[];

  private constructor(dotConfig: FusebitOpsDotConfig, mfaCodeResolver?: IFusebitOpsMfaCodeResolver) {
    this.dotConfig = dotConfig;
    this.mfaCodeResolver = mfaCodeResolver;
    this.log = [];
  }

  public static async create(mfaCodeResolver?: IFusebitOpsMfaCodeResolver) {
    const dotConfig = await FusebitOpsDotConfig.create();
    return new FusebitOpsCore(dotConfig, mfaCodeResolver);
  }

  public async getMode(): Promise<string | undefined> {
    const prodAccount = await this.dotConfig.getAwsAccount(AwsAccountType.prod);
    if (prodAccount === undefined) {
      return 'init';
    }

    return undefined;
  }

  public async getSettingsPath() {
    return this.dotConfig.getSettingsPath();
  }

  public async logError(error: Error, message: string) {
    this.log.push({ error, message });
  }

  public async getLogs() {
    return this.log.slice();
  }

  public async setSettings(settings: IFusebitOpsCoreSettings) {
    if (settings.awsProdAccount) {
      await this.dotConfig.setAwsAccount(AwsAccountType.prod, settings.awsProdAccount);
    }
    if (settings.awsUserAccount) {
      await this.dotConfig.setAwsAccount(AwsAccountType.user, settings.awsUserAccount);
    }
    if (settings.awsProdRole) {
      await this.dotConfig.setAwsRole(AwsAccountType.prod, mainProdRole, settings.awsProdRole);
    }

    const user: IAwsUser = (await this.dotConfig.getAwsUser()) || {};
    if (settings.awsUserName) {
      user.userName = settings.awsUserName;
    }
    if (settings.awsUserSecretAccessKey) {
      user.secretAccessKey = settings.awsUserSecretAccessKey;
    }
    if (settings.awsUserAccessKeyId) {
      user.accessKeyId = settings.awsUserAccessKeyId;
    }
    await this.dotConfig.setAwsUser(user);
  }

  public async getSettings() {
    const awsProdAccount = await this.dotConfig.getAwsAccount(AwsAccountType.prod);
    const awsUserAccount = await this.dotConfig.getAwsAccount(AwsAccountType.user);
    const awsProdRole = await this.dotConfig.getAwsRole(AwsAccountType.prod, mainProdRole);
    const user = await this.dotConfig.getAwsUser();
    return {
      awsProdAccount,
      awsUserAccount,
      awsProdRole,
      awsUserName: user ? user.userName : undefined,
      awsUserAccessKeyId: user ? user.accessKeyId : undefined,
      awsUserSecretAccessKey: user ? user.secretAccessKey : undefined,
    };
  }

  public async getProdAccount() {
    const prodAccount = await this.dotConfig.getAwsAccount(AwsAccountType.prod);
    if (!prodAccount) {
      const message = 'AWS prod account setting is not initialized.';
      throw new Error(message);
    }
    return prodAccount;
  }

  public async getUserAccount() {
    const userAccount = await this.dotConfig.getAwsAccount(AwsAccountType.user);
    if (!userAccount) {
      const message = 'AWS user account setting is not initialized.';
      throw new Error(message);
    }
    return userAccount;
  }

  public async installationExists() {
    const opsCore = await this.getOpsCore();
    const coreSetup = await opsCore.isSetup();
    if (!coreSetup) {
      return false;
    }

    const opsPublish = await this.getOpsPublish();
    const publishSetup = await opsPublish.isSetup();
    if (!publishSetup) {
      return false;
    }

    const opsDeploy = await this.getOpsDeploy();
    const deploySetup = await opsDeploy.isSetup();
    if (!deploySetup) {
      return false;
    }

    return true;
  }

  public async ensureInstallation() {
    const opsCore = await this.getOpsCore();
    await opsCore.setup();
    const prodAccountId = await this.getProdAccount();
    const prodAccountRole = await this.getProdRole();
    await opsCore.ensureAwsAccount({
      name: 'prod',
      id: prodAccountId,
      role: prodAccountRole,
    });

    const opsPublish = await this.getOpsPublish();
    await opsPublish.setup();

    const opsDeploy = await this.getOpsDeploy();
    return opsDeploy.setup();
  }

  public async accountExists(account: IFusebitOpsAccount) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.awsAccountExists(account);
  }

  public async addAccount(account: IFusebitOpsAccount) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.addAwsAccount(account);
  }

  public async listAccounts() {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.listAwsAccounts();
  }

  public async networkExists(network: IFusebitOpsNetwork) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.awsNetworkExists(network);
  }

  public async addNetwork(network: IFusebitOpsNetwork) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.addAwsNetwork(network);
  }

  public async listNetworks() {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.listAwsNetworks();
  }

  public async domainExists(domain: IFusebitOpsDomain) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.awsDomainExists(domain);
  }

  public async addDomain(domain: IFusebitOpsDomain) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.addAwsDomain(domain);
  }

  public async getDomain(domainName: string) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.getAwsDomain(domainName);
  }

  public async listDomains() {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.listAwsDomains();
  }

  public async buildApi(apiName: string) {
    await this.errorIfNotAnApi(apiName);
    const publish = await this.getOpsPublish();
    const fusebitDeployment = await this.getFusebitDeployment();
    const api = fusebitDeployment[apiName];
    return publish.buildApi(api.getApiWorkspaceName());
  }

  public async bundleApi(apiName: string) {
    await this.errorIfNotAnApi(apiName);
    const publish = await this.getOpsPublish();
    const fusebitDeployment = await this.getFusebitDeployment();
    const api = fusebitDeployment[apiName];
    return publish.bundleApi(api.getApiWorkspaceName());
  }

  public async publishApi(apiName: string, user: string, comment?: string) {
    await this.errorIfNotAnApi(apiName);
    const publish = await this.getOpsPublish();
    const fusebitDeployment = await this.getFusebitDeployment();
    const api = fusebitDeployment[apiName];
    const workspace = api.getApiWorkspaceName();
    return publish.publishApi({ api: apiName, workspace, user, comment });
  }

  public async listApis() {
    const fusebitDeployment = await this.getFusebitDeployment();
    return [];
    //return Object.keys(fusebitDeployment);
  }

  public async getPublishedApi(api: string, publishId: string) {
    await this.errorIfNotAnApi(api);
    const publish = await this.getOpsPublish();
    return publish.getPublishedApi(api, publishId);
  }

  public async listPublishedApi(api: string, user?: string, limit?: number, next?: any) {
    await this.errorIfNotAnApi(api);
    const publish = await this.getOpsPublish();
    return publish.listPublishedApi(api, user, limit, next);
  }

  public async getDeployment(deploymentName: string) {
    const deploy = await this.getOpsDeploy();
    return deploy.getAwsDeployment(deploymentName);
  }

  public async deploymentExists(deployment: IFusebitOpsDeployment) {
    const deploy = await this.getOpsDeploy();
    return deploy.awsDeploymentExists(deployment);
  }

  public async addDeployment(deployment: IFusebitOpsDeployment, publishDetails: IFusebitOpsPublishDetails[]) {
    const deploy = await this.getOpsDeploy();
    deployment.apis = publishDetails.map(detail => ({ name: detail.api, publishId: detail.id }));
    return deploy.addAwsDeployment(deployment);
  }

  public async certExists(deployment: IFusebitOpsDeployment) {
    const deploy = await this.getOpsDeploy();
    return deploy.awsCertExists(deployment.name);
  }

  public async issueCert(deployment: IFusebitOpsDeployment) {
    const deploy = await this.getOpsDeploy();
    return deploy.issueAwsCert(deployment.name);
  }

  public async isApiSetup(deployment: IFusebitOpsDeployment, apiName: string) {
    const fusebitDeployment = await this.getFusebitDeployment();
    const opsApi = fusebitDeployment[apiName];
    const deploy = await this.getOpsDeploy();
    return deploy.isApiSetup(deployment.name, opsApi);
  }

  public async setupApi(deployment: IFusebitOpsDeployment, publishDetails: IFusebitOpsPublishDetails) {
    const fusebitDeployment = await this.getFusebitDeployment();
    const opsApi = fusebitDeployment[publishDetails.api];
    const deployApi = {
      s3Bucket: publishDetails.s3Bucket,
      s3Key: publishDetails.s3Key,
      deployment: deployment.name,
      network: deployment.network,
    };
    const deploy = await this.getOpsDeploy();
    return deploy.setupApi(deployment.name, deployApi, opsApi);
  }

  public async deployApi(deployment: IFusebitOpsDeployment, publishDetails: IFusebitOpsPublishDetails) {
    const fusebitDeployment = await this.getFusebitDeployment();
    const opsApi = fusebitDeployment[publishDetails.api];
    const deployApi = {
      s3Bucket: publishDetails.s3Bucket,
      s3Key: publishDetails.s3Key,
      deployment: deployment.name,
      network: deployment.network,
    };
    const deploy = await this.getOpsDeploy();
    return deploy.deployApi(deployment.name, deployApi, opsApi);
  }

  public async addDeploymentAlb(deployment: IFusebitOpsDeployment) {
    const deploy = await this.getOpsDeploy();
    return deploy.addAwsAlb(deployment.name);
  }

  public async pushImage(repository: string, tag: string) {
    const publish = await this.getOpsPublish();
    return publish.pushImage(repository, tag);
  }

  public async deployInstance(deploymentName: string, image: string) {
    const deploy = await this.getOpsDeploy();
    return deploy.deployInstance(deploymentName, image);
  }

  private async getFusebitDeployment() {
    if (!this.fusebitDeployment) {
      const opsCore = await this.getOpsCore();
      const accountApi = await OpsAccountAws.create(opsCore);
      const userApi = await OpsUserAws.create(opsCore);
      this.fusebitDeployment = {};

      const accountApiName = accountApi.getApiName();
      this.fusebitDeployment[accountApiName] = accountApi;

      const userApiName = userApi.getApiName();
      this.fusebitDeployment[userApiName] = userApi;
    }
    return this.fusebitDeployment;
  }

  public async setupAccountApi(deploymentName: string) {
    const deployment = await this.getDeployment(deploymentName);
    if (!deployment) {
      const message = `There is no '${deploymentName}' deployment on the Fusebit platform.`;
      throw new Error(message);
    }

    const opsDeploy = await this.getOpsDeploy();
    const options = await opsDeploy.getOptions(deploymentName);
    if (!options) {
      const message = `There was an issue resolving the '${deploymentName}' deployment options.`;
      throw new Error(message);
    }

    const opsCore = await this.getOpsCore();
    const accountApi = await OpsAccountAws.create(opsCore);
    const apiSetup = {
      deployment: deployment.name,
      network: deployment.network,
      s3Bucket: '',
      s3Key: '',
    };
    return accountApi.setupApi(apiSetup, options);
  }

  // public async addRootUser(deploymentName: string, firstName: string, lastName: string) {
  //   const deployment = await this.getDeployment(deploymentName);
  //   if (!deployment) {
  //     const message = `There is no '${deploymentName}' deployment on the Fusebit platform.`;
  //     throw new Error(message);
  //   }
  //   const domain = await this.getDomain(deployment.domain);
  //   if (!domain) {
  //     const message = `There is no '${deployment.domain}' domain on the Fusebit platform.`;
  //     throw new Error(message);
  //   }

  //   const FusebitProfile = await FusebitProfile.create();
  //   const profileName = `${deploymentName}-root`;
  //   const baseUrl = `${deploymentName}.${domain.name}`;

  //   const rootUserProfile = await FusebitProfile.addProfile(profileName, { baseUrl });
  //   if (!rootUserProfile.issuer || !rootUserProfile.subject) {
  //     const message = `There was an issue generating the issuer for the new '${profileName}' profile.`;
  //     throw new Error(message);
  //   }

  //   const publicKey = await FusebitProfile.getPublicKey(profileName);
  //   if (!publicKey) {
  //     const message = `There was an issue generating the public key for the new '${profileName}' profile.`;
  //     throw new Error(message);
  //   }

  //   const rootUser = {
  //     firstName,
  //     lastName,
  //     identities: [{ iss: rootUserProfile.issuer, sub: rootUserProfile.subject }],
  //   };

  //   const issuer = {
  //     id: rootUserProfile.issuer,
  //     displayName: `Root User CLI Access - ${firstName} ${lastName}`,
  //     publicKeys: [{ keyId: rootUserProfile.kid, publicKey }],
  //   };

  //   const opsDeploy = await this.getOpsDeploy();
  //   const options = await opsDeploy.getOptions(deploymentName);
  //   if (!options) {
  //     const message = `There was an issue resolving the '${deploymentName}' deployment options.`;
  //     throw new Error(message);
  //   }

  //   const opsCore = await this.getOpsCore();
  //   const accountApi = await OpsAccountAws.create(opsCore);
  //   return accountApi.addRootUser(issuer, rootUser, options);
  // }

  private async errorIfNotAnApi(name: string) {
    const fusebitDeployment = await this.getFusebitDeployment();
    const api = fusebitDeployment[name];
    if (!api) {
      const message = `There is no '${name}' api on the Fusebit platform.`;
      throw new Error(message);
    }
  }

  private async errorIfNotInstalled() {
    const installed = await this.installationExists();
    if (!installed) {
      const message = [
        'The Fusebit platform is not installed. Ensure that the Fusebit platform',
        'is installed and then try again.',
      ].join(' ');
      throw new Error(message);
    }
  }

  private async getUserCreds() {
    if (!this.userCreds) {
      const user = await this.getUser();
      const userAccount = await this.getUserAccount();
      const userCredOptions = {
        account: userAccount,
        accessKeyId: user.accessKeyId,
        secretAccessKey: user.secretAccessKey,
        userName: user.userName,
        useMfa: this.mfaCodeResolver ? true : false,
        mfaCodeResolver: this.mfaCodeResolver,
      };
      const credsCache = await this.getCredsCache();
      this.userCreds = await AwsCreds.create(userCredOptions, credsCache);
    }

    return this.userCreds;
  }

  private async getOpsCore() {
    if (!this.opsCore) {
      const userCreds = await this.getUserCreds();
      const prodAccount = await this.getProdAccount();
      const prodRole = await this.getProdRole();
      this.opsCore = await OpsCoreAws.create(userCreds, prodAccount, prodRole);
    }
    return this.opsCore;
  }

  private async getOpsPublish() {
    if (!this.opsPublish) {
      const userCreds = await this.getUserCreds();
      const prodAccount = await this.getProdAccount();
      const prodRole = await this.getProdRole();
      this.opsPublish = await OpsPublishAws.create(userCreds, prodAccount, prodRole);
    }
    return this.opsPublish;
  }

  private async getOpsDeploy() {
    if (!this.opsDeploy) {
      const opsCore = await this.getOpsCore();
      const userCreds = await this.getUserCreds();
      const prodAccount = await this.getProdAccount();
      const prodRole = await this.getProdRole();
      this.opsDeploy = await OpsDeployAws.create(opsCore, userCreds, prodAccount, prodRole);
    }
    return this.opsDeploy;
  }

  private async getUser() {
    const user = await this.dotConfig.getAwsUser();
    if (!user) {
      const message = 'AWS user settings are not initialized.';
      throw new Error(message);
    }
    return user;
  }

  private async getProdRole() {
    const prodRole = await this.dotConfig.getAwsRole(AwsAccountType.prod, mainProdRole);
    if (!prodRole) {
      const message = 'AWS prod role setting is not initialized.';
      throw new Error(message);
    }
    return prodRole;
  }

  private async getCredsCache() {
    const set = async (key: string, creds: string) => {
      return this.dotConfig.setCachedCreds(key, creds);
    };
    const get = async (key: string) => {
      return this.dotConfig.getCachedCreds(key);
    };

    return { get, set };
  }
}
