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
import { OpsDataTables } from './OpsDataTables';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsAccountData } from './OpsAccountData';
import { OpsDomainData } from './OpsDomainData';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsImageData } from './OpsImageData';
import { OpsDeploymentData } from './OpsDeploymentData';
import { OpsStackData } from './OpsStackData';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { OpsIam } from './OpsIam';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsContext extends DataSource implements IOpsDataContext {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const tables = await OpsDataTables.create(config, provider);
    const account = await OpsAccountData.create(config, provider, tables);
    const domain = await OpsDomainData.create(config, provider, tables);
    const network = await OpsNetworkData.create(config, provider, tables);
    const image = await OpsImageData.create(config, provider, tables);
    const deployment = await OpsDeploymentData.create(config, provider, tables);
    const stack = await OpsStackData.create(config, provider, tables);
    const iam = await OpsIam.create(config, provider);
    return new OpsDataAwsContext(tables, account, domain, network, image, deployment, stack, iam);
  }

  private constructor(
    tables: OpsDataTables,
    account: OpsAccountData,
    domain: OpsDomainData,
    network: OpsNetworkData,
    image: OpsImageData,
    deployment: OpsDeploymentData,
    stack: OpsStackData,
    iam: OpsIam
  ) {
    super([tables, iam, image]);
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
