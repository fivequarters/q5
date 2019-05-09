import { DataSource } from '@5qtrs/data';
import {
  IOpsDeploymentData,
  IOpsDeployment,
  IListOpsDeploymentOptions,
  IListOpsDeploymentResult,
  OpsDataException,
  OpsDataExceptionCode,
} from '@5qtrs/ops-data';
import { AccountDataAwsContextFactory } from '@5qtrs/account-data-aws';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsNetworkData } from './OpsNetworkData';
import { DeploymentTable } from './tables/DeploymentTable';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { createFunctionStorage } from './OpsFunctionStorage';
import { createCron } from './OpsCron';
import { createDwhExport } from './OpsDwh';

// ----------------
// Exported Classes
// ----------------

export class OpsDeploymentData extends DataSource implements IOpsDeploymentData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const awsConfig = await provider.getAwsConfigForMain();
    const dynamo = await AwsDynamo.create(awsConfig);
    const networkData = await OpsNetworkData.create(config, provider);
    const deploymentTable = await DeploymentTable.create(config, dynamo);
    return new OpsDeploymentData(config, deploymentTable, provider, networkData);
  }

  private config: OpsDataAwsConfig;
  private deploymentTable: DeploymentTable;
  private provider: OpsDataAwsProvider;
  private networkData: OpsNetworkData;

  private constructor(
    config: OpsDataAwsConfig,
    deploymentTable: DeploymentTable,
    provider: OpsDataAwsProvider,
    networkData: OpsNetworkData
  ) {
    super([deploymentTable]);
    this.config = config;
    this.deploymentTable = deploymentTable;
    this.provider = provider;
    this.networkData = networkData;
  }

  public async exists(deployment: IOpsDeployment): Promise<boolean> {
    try {
      const existing = await this.deploymentTable.get(deployment.deploymentName);
      if (existing.domainName !== deployment.domainName) {
        throw OpsDataException.deploymentDifferentDomain(deployment.deploymentName, existing.domainName);
      }
      if (existing.networkName !== deployment.networkName) {
        throw OpsDataException.deploymentDifferentNetwork(deployment.deploymentName, existing.networkName);
      }
      await this.ensureDeploymentSetup(deployment);
      return true;
    } catch (error) {
      if (error.code === OpsDataExceptionCode.noDeployment) {
        return false;
      }
      throw error;
    }
  }

  public async add(deployment: IOpsDeployment): Promise<void> {
    await this.deploymentTable.add(deployment);
    try {
      await this.ensureDeploymentSetup(deployment);
    } catch (error) {
      await this.deploymentTable.delete(deployment.deploymentName);
      throw error;
    }
  }

  public async get(deploymentName: string): Promise<IOpsDeployment> {
    return this.deploymentTable.get(deploymentName);
  }

  public async list(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult> {
    return this.deploymentTable.list(options);
  }

  public async listAll(): Promise<IOpsDeployment[]> {
    return this.deploymentTable.listAll();
  }

  private async ensureDeploymentSetup(deployment: IOpsDeployment): Promise<void> {
    ['FUSEBIT_GC_BQ_KEY_BASE64'].forEach(x => {
      if (!process.env[x]) throw new Error(`You must specify ${x} environment variable.`);
    });

    const network = await this.networkData.get(deployment.networkName);
    const awsConfig = await this.provider.getAwsConfig(network.accountName, network.region, deployment.deploymentName);
    const accountDataFactory = await AccountDataAwsContextFactory.create(awsConfig);
    const accountData = await accountDataFactory.create(this.config);

    await accountData.setup();
    await createFunctionStorage(this.config, awsConfig);
    await createCron(this.config, awsConfig);
    await createDwhExport(this.config, awsConfig);
  }
}
