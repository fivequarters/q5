import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AwsNetwork } from '@5qtrs/aws-network';
import { AwsRoute53 } from '@5qtrs/aws-route53';
import { AwsAlb } from '@5qtrs/aws-alb';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { AccountTable } from './tables/AccountTable';
import { DomainTable } from './tables/DomainTable';
import { NetworkTable } from './tables/NetworkTable';
import { DeploymentTable } from './tables/DeploymentTable';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsProvider {
  public static async create(creds: AwsCreds, config: OpsDataAwsConfig) {
    return new OpsDataAwsProvider(creds, config);
  }
  private creds: AwsCreds;
  private config: OpsDataAwsConfig;
  private mainAwsConfig?: IAwsConfig;
  private deploymentTable?: DeploymentTable;
  private networkTable?: NetworkTable;
  private domainTable?: DomainTable;
  private accountTable?: AccountTable;

  private constructor(creds: AwsCreds, config: OpsDataAwsConfig) {
    this.creds = creds;
    this.config = config;
  }

  public async getAwsConfigForMain(): Promise<IAwsConfig> {
    if (!this.mainAwsConfig) {
      this.mainAwsConfig = {
        creds: this.getAwsCredsForAccount(this.config.mainAccountId, this.config.mainAccountRole),
        account: this.config.mainAccountId,
        region: this.config.mainRegion,
        prefix: this.config.mainPrefix,
      };
    }
    return this.mainAwsConfig;
  }

  public async getAwsConfigForDeployment(deploymentName: string, region: string): Promise<IAwsConfig> {
    const deploymentTable = await this.getDeploymentTable();
    const deployment = await deploymentTable.get(deploymentName, region);

    const networkTable = await this.getNetworkTable();
    const network = await networkTable.get(deployment.networkName, deployment.region);

    const accountTable = await this.getAccountTable();
    const account = await accountTable.get(network.accountName);

    const creds = this.getAwsCredsForAccount(account.id, account.role);
    return {
      creds,
      account: account.id,
      region: network.region,
      prefix: deploymentName,
    };
  }

  public async getAwsConfigForDomain(domainName: string): Promise<IAwsConfig> {
    const domainTable = await this.getDomainTable();
    const domain = await domainTable.get(domainName);

    const accountTable = await this.getAccountTable();
    const account = await accountTable.get(domain.accountName);

    const creds = this.getAwsCredsForAccount(account.id, account.role);
    return {
      creds,
      account: account.id,
      region: this.config.mainRegion,
    };
  }

  public async getAwsNetworkFromNetwork(networkName: string, region: string): Promise<AwsNetwork> {
    const networkTable = await this.getNetworkTable();
    const network = await networkTable.get(networkName, region);
    return this.getAwsNetworkFromAccount(network.accountName, network.region);
  }

  public async getAwsNetworkFromAccount(accountName: string, region: string): Promise<AwsNetwork> {
    const accountTable = await this.getAccountTable();
    const account = await accountTable.get(accountName);
    const creds = this.getAwsCredsForAccount(account.id, account.role);
    const config = {
      creds,
      account: account.id,
      region,
    };

    return AwsNetwork.create(config);
  }

  public async getAwsRoute53FromAccount(accountName: string): Promise<AwsRoute53> {
    const accountTable = await this.getAccountTable();
    const account = await accountTable.get(accountName);

    const creds = this.getAwsCredsForAccount(account.id, account.role);
    const config = {
      creds,
      account: account.id,
      region: this.config.mainRegion,
    };

    return AwsRoute53.create(config);
  }

  public async getAwsRoute53FromDomain(domainName: string): Promise<AwsRoute53> {
    const domainTable = await this.getDomainTable();
    const domain = await domainTable.get(domainName);
    return this.getAwsRoute53FromAccount(domain.accountName);
  }

  public async getAwsAlb(deploymentName: string, region: string): Promise<AwsAlb> {
    const config = await this.getAwsConfigForDeployment(deploymentName, region);
    return AwsAlb.create(config);
  }

  private getAwsCredsForAccount(accountId: string, accountRole: string): AwsCreds {
    if (accountId === this.config.mainAccountId) {
      return this.config.userAccountEnabled
        ? this.creds.asRole(this.config.mainAccountId, this.config.mainAccountRole)
        : this.creds;
    }
    return this.creds.asRole(accountId, accountRole);
  }

  private async getDeploymentTable(): Promise<DeploymentTable> {
    if (!this.deploymentTable) {
      const awsConfig = await this.getAwsConfigForMain();
      const dynamo = await AwsDynamo.create(awsConfig);
      this.deploymentTable = await DeploymentTable.create(this.config, dynamo);
    }

    return this.deploymentTable;
  }

  private async getNetworkTable(): Promise<NetworkTable> {
    if (!this.networkTable) {
      const awsConfig = await this.getAwsConfigForMain();
      const dynamo = await AwsDynamo.create(awsConfig);
      this.networkTable = await NetworkTable.create(this.config, dynamo);
    }

    return this.networkTable;
  }

  private async getDomainTable(): Promise<DomainTable> {
    if (!this.domainTable) {
      const awsConfig = await this.getAwsConfigForMain();
      const dynamo = await AwsDynamo.create(awsConfig);
      this.domainTable = await DomainTable.create(this.config, dynamo);
    }

    return this.domainTable;
  }

  private async getAccountTable(): Promise<AccountTable> {
    if (!this.accountTable) {
      const awsConfig = await this.getAwsConfigForMain();
      const dynamo = await AwsDynamo.create(awsConfig);
      this.accountTable = await AccountTable.create(this.config, dynamo);
    }

    return this.accountTable;
  }
}
