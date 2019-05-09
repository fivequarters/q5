import { DataSource } from '@5qtrs/data';
import {
  IOpsDataContext,
  IOpsAccountData,
  IOpsDomainData,
  IOpsNetworkData,
  IOpsImageData,
  IOpsDeploymentData,
  IOpsStackData,
} from '@5qtrs/ops-data';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsAccountData } from './OpsAccountData';
import { OpsDomainData } from './OpsDomainData';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsImageData } from './OpsImageData';
import { OpsDeploymentData } from './OpsDeploymentData';
import { OpsStackData } from './OpsStackData';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsContext extends DataSource implements IOpsDataContext {
  public static async create(config: OpsDataAwsConfig, awsProvider: OpsDataAwsProvider) {
    const account = await OpsAccountData.create(config, awsProvider);
    const domain = await OpsDomainData.create(config, awsProvider);
    const network = await OpsNetworkData.create(config, awsProvider);
    const image = await OpsImageData.create(config, awsProvider);
    const deployment = await OpsDeploymentData.create(config, awsProvider);
    const stack = await OpsStackData.create(config, awsProvider);
    return new OpsDataAwsContext(account, domain, network, image, deployment, stack);
  }

  private constructor(
    account: OpsAccountData,
    domain: OpsDomainData,
    network: OpsNetworkData,
    image: OpsImageData,
    deployment: OpsDeploymentData,
    stack: OpsStackData
  ) {
    super([account, domain, network, image, deployment, stack]);
    this.account = account;
    this.domain = domain;
    this.network = network;
    this.image = image;
    this.deployment = deployment;
    this.stack = stack;
  }

  private account: OpsAccountData;
  private domain: OpsDomainData;
  private network: OpsNetworkData;
  private image: OpsImageData;
  private deployment: OpsDeploymentData;
  private stack: OpsStackData;

  public get accountData(): IOpsAccountData {
    return this.account;
  }

  public get domainData(): IOpsDomainData {
    return this.domain;
  }

  public get networkData(): IOpsNetworkData {
    return this.network;
  }

  public get imageData(): IOpsImageData {
    return this.image;
  }

  public get deploymentData(): IOpsDeploymentData {
    return this.deployment;
  }

  public get stackData(): IOpsStackData {
    return this.stack;
  }
}
