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
import { StorageDataAwsContextFactory } from '@5qtrs/storage-data-aws';
import { OpsDataTables } from './OpsDataTables';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { OpsAlb } from './OpsAlb';
import { createFunctionStorage } from './OpsFunctionStorage';
import { createCron } from './OpsCron';
import { createDwhExport } from './OpsDwh';
import { createLogsTable } from './OpsLogs';

// ----------------
// Exported Classes
// ----------------

export class OpsDeploymentData extends DataSource implements IOpsDeploymentData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    return new OpsDeploymentData(config, provider, tables);
  }

  private config: OpsDataAwsConfig;
  private tables: OpsDataTables;
  private provider: OpsDataAwsProvider;

  private constructor(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    super([]);
    this.config = config;
    this.tables = tables;
    this.provider = provider;
  }

  public async exists(deployment: IOpsDeployment): Promise<boolean> {
    try {
      const existing = await this.tables.deploymentTable.get(deployment.deploymentName, deployment.region);
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
    await this.tables.deploymentTable.add(deployment);
    try {
      await this.ensureDeploymentSetup(deployment);
    } catch (error) {
      await this.tables.deploymentTable.delete(deployment.deploymentName, deployment.region);
      throw error;
    }
  }

  public async get(deploymentName: string, region: string): Promise<IOpsDeployment> {
    return this.tables.deploymentTable.get(deploymentName, region);
  }

  public async list(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult> {
    return this.tables.deploymentTable.list(options);
  }

  public async listAll(deploymentName?: string): Promise<IOpsDeployment[]> {
    return this.tables.deploymentTable.listAll(deploymentName);
  }

  private async ensureDeploymentSetup(deployment: IOpsDeployment): Promise<void> {
    const awsConfig = await this.provider.getAwsConfigForDeployment(deployment.deploymentName, deployment.region);

    const accountDataFactory = await AccountDataAwsContextFactory.create(awsConfig);
    const accountData = await accountDataFactory.create(this.config);
    await accountData.setup();

    const storageDataFactory = await StorageDataAwsContextFactory.create(awsConfig);
    const storageData = await storageDataFactory.create(this.config);
    await storageData.setup();

    await createLogsTable(this.config, awsConfig);
    await createFunctionStorage(this.config, awsConfig);
    await createCron(this.config, awsConfig);
    if (deployment.dataWarehouseEnabled) {
      await createDwhExport(this.config, awsConfig);
    }

    const awsAlb = await OpsAlb.create(this.config, this.provider, this.tables);
    await awsAlb.addAlb(deployment);
  }
}
