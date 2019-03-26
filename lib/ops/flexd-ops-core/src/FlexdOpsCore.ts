import { FlexdOpsDotConfig, AwsAccountType, IAwsUser } from './FlexdOpsDotConfig';
import { AwsCreds, IMfaCodeResolver as IFlexdOpsMfaCodeResolver } from '@5qtrs/aws-cred';
import {
  OpsCoreAws,
  IOpsAwsAccount as IFlexdOpsAccount,
  IOpsAwsNetwork as IFlexdOpsNetwork,
  IOpsAwsDomain as IFlexdOpsDomain,
} from '@5qtrs/ops-core-aws';

import {
  OpsDeployAws,
  IOpsAwsDeployment as IFlexdOpsDeployment,
  IOpsAwsDeploymentDetails as IFlexdOpsDeploymentDetails,
  IOpsAwsDeploymentDetailsList as IFlexdOpsDeploymentDetailsList,
} from '@5qtrs/ops-deploy-aws';

import { OpsPublishAws, IOpsAwsPublishDetails as IFlexdOpsPublishDetails } from '@5qtrs/ops-publish-aws';
import { OpsApiAws } from '@5qtrs/ops-api-aws';
import { OpsAccountAws } from '@5qtrs/ops-account-aws';
import { OpsUserAws } from '@5qtrs/ops-user-aws';

export {
  IOpsAwsPublishDetails as IFlexdOpsPublishDetails,
  IOpsAwsPublishDetailsList as IFlexdOpsPublishDetailsList,
} from '@5qtrs/ops-publish-aws';

export {
  IOpsAwsDeployment as IFlexdOpsDeployment,
  IOpsAwsDeploymentDetails as IFlexdOpsDeploymentDetails,
  IOpsAwsDeploymentDetailsList as IFlexdOpsDeploymentDetailsList,
} from '@5qtrs/ops-deploy-aws';

export {
  IOpsAwsAccount as IFlexdOpsAccount,
  IOpsAwsNetwork as IFlexdOpsNetwork,
  IOpsAwsDomain as IFlexdOpsDomain,
} from '@5qtrs/ops-core-aws';
export { IMfaCodeResolver as IFlexdOpsMfaCodeResolver } from '@5qtrs/aws-cred';

// ------------------
// Internal Constants
// ------------------

const mainProdRole = 'main';

// -------------------
// Internal Interfaces
// -------------------

interface IFlexdDeployment {
  [index: string]: OpsApiAws;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFlexdOpsCoreSettings {
  awsProdAccount?: string;
  awsUserAccount?: string;
  awsProdRole?: string;
  awsUserName?: string;
  awsUserSecretAccessKey?: string;
  awsUserAccessKeyId?: string;
}

export interface IFlexdOpsLogEntry {
  error?: Error;
  message?: string;
}

// ----------------
// Exported Classes
// ----------------

export class FlexdOpsCore {
  private dotConfig: FlexdOpsDotConfig;
  private flexdDeployment?: IFlexdDeployment;
  private mfaCodeResolver?: IFlexdOpsMfaCodeResolver;
  private opsDeploy?: OpsDeployAws;
  private opsPublish?: OpsPublishAws;
  private opsCore?: OpsCoreAws;
  private userCreds?: AwsCreds;
  private log: IFlexdOpsLogEntry[];

  private constructor(dotConfig: FlexdOpsDotConfig, mfaCodeResolver?: IFlexdOpsMfaCodeResolver) {
    this.dotConfig = dotConfig;
    this.mfaCodeResolver = mfaCodeResolver;
    this.log = [];
  }

  public static async create(mfaCodeResolver?: IFlexdOpsMfaCodeResolver) {
    const dotConfig = await FlexdOpsDotConfig.create();
    return new FlexdOpsCore(dotConfig, mfaCodeResolver);
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

  public async setSettings(settings: IFlexdOpsCoreSettings) {
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

  public async accountExists(account: IFlexdOpsAccount) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.awsAccountExists(account);
  }

  public async addAccount(account: IFlexdOpsAccount) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.addAwsAccount(account);
  }

  public async listAccounts() {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.listAwsAccounts();
  }

  public async networkExists(network: IFlexdOpsNetwork) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.awsNetworkExists(network);
  }

  public async addNetwork(network: IFlexdOpsNetwork) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.addAwsNetwork(network);
  }

  public async listNetworks() {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.listAwsNetworks();
  }

  public async domainExists(domain: IFlexdOpsDomain) {
    await this.errorIfNotInstalled();
    const opsCore = await this.getOpsCore();
    return opsCore.awsDomainExists(domain);
  }

  public async addDomain(domain: IFlexdOpsDomain) {
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
    const flexdDeployment = await this.getFlexdDeployment();
    const api = flexdDeployment[apiName];
    return publish.buildApi(api.getApiWorkspaceName());
  }

  public async bundleApi(apiName: string) {
    await this.errorIfNotAnApi(apiName);
    const publish = await this.getOpsPublish();
    const flexdDeployment = await this.getFlexdDeployment();
    const api = flexdDeployment[apiName];
    return publish.bundleApi(api.getApiWorkspaceName());
  }

  public async publishApi(apiName: string, user: string, comment?: string) {
    await this.errorIfNotAnApi(apiName);
    const publish = await this.getOpsPublish();
    const flexdDeployment = await this.getFlexdDeployment();
    const api = flexdDeployment[apiName];
    const workspace = api.getApiWorkspaceName();
    return publish.publishApi({ api: apiName, workspace, user, comment });
  }

  public async listApis() {
    const flexdDeployment = await this.getFlexdDeployment();
    return [];
    //return Object.keys(flexdDeployment);
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

  public async deploymentExists(deployment: IFlexdOpsDeployment) {
    const deploy = await this.getOpsDeploy();
    return deploy.awsDeploymentExists(deployment);
  }

  public async addDeployment(deployment: IFlexdOpsDeployment, publishDetails: IFlexdOpsPublishDetails[]) {
    const deploy = await this.getOpsDeploy();
    deployment.apis = publishDetails.map(detail => ({ name: detail.api, publishId: detail.id }));
    return deploy.addAwsDeployment(deployment);
  }

  public async certExists(deployment: IFlexdOpsDeployment) {
    const deploy = await this.getOpsDeploy();
    return deploy.awsCertExists(deployment.name);
  }

  public async issueCert(deployment: IFlexdOpsDeployment) {
    const deploy = await this.getOpsDeploy();
    return deploy.issueAwsCert(deployment.name);
  }

  public async isApiSetup(deployment: IFlexdOpsDeployment, apiName: string) {
    const flexdDeployment = await this.getFlexdDeployment();
    const opsApi = flexdDeployment[apiName];
    const deploy = await this.getOpsDeploy();
    return deploy.isApiSetup(deployment.name, opsApi);
  }

  public async setupApi(deployment: IFlexdOpsDeployment, publishDetails: IFlexdOpsPublishDetails) {
    const flexdDeployment = await this.getFlexdDeployment();
    const opsApi = flexdDeployment[publishDetails.api];
    const deployApi = {
      s3Bucket: publishDetails.s3Bucket,
      s3Key: publishDetails.s3Key,
      deployment: deployment.name,
      network: deployment.network,
    };
    const deploy = await this.getOpsDeploy();
    return deploy.setupApi(deployment.name, deployApi, opsApi);
  }

  public async deployApi(deployment: IFlexdOpsDeployment, publishDetails: IFlexdOpsPublishDetails) {
    const flexdDeployment = await this.getFlexdDeployment();
    const opsApi = flexdDeployment[publishDetails.api];
    const deployApi = {
      s3Bucket: publishDetails.s3Bucket,
      s3Key: publishDetails.s3Key,
      deployment: deployment.name,
      network: deployment.network,
    };
    const deploy = await this.getOpsDeploy();
    return deploy.deployApi(deployment.name, deployApi, opsApi);
  }

  public async addDeploymentAlb(deployment: IFlexdOpsDeployment) {
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

  private async getFlexdDeployment() {
    if (!this.flexdDeployment) {
      const opsCore = await this.getOpsCore();
      const accountApi = await OpsAccountAws.create(opsCore);
      const userApi = await OpsUserAws.create(opsCore);
      this.flexdDeployment = {};

      const accountApiName = accountApi.getApiName();
      this.flexdDeployment[accountApiName] = accountApi;

      const userApiName = userApi.getApiName();
      this.flexdDeployment[userApiName] = userApi;
    }
    return this.flexdDeployment;
  }

  private async errorIfNotAnApi(name: string) {
    const flexdDeployment = await this.getFlexdDeployment();
    const api = flexdDeployment[name];
    if (!api) {
      const message = `There is no '${name}' api on the Flexd platform.`;
      throw new Error(message);
    }
  }

  private async errorIfNotInstalled() {
    const installed = await this.installationExists();
    if (!installed) {
      const message = [
        'The Flexd platform is not installed. Ensure that the Flexd platform',
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
