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

// ------------------
// Internal Constants
// ------------------

const mainProdRole = 'main';

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
