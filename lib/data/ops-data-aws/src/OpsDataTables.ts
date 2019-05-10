import { DataSource } from '@5qtrs/data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { AccountIdTable } from './tables/AccountIdTable';
import { AccountTable } from './tables/AccountTable';
import { DeploymentTable } from './tables/DeploymentTable';
import { DomainTable } from './tables/DomainTable';
import { NetworkTable } from './tables/NetworkTable';
import { StackTable } from './tables/StackTable';

// ----------------
// Exported Classes
// ----------------

export class OpsDataTables extends DataSource {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const awsConfig = await provider.getAwsConfigForMain();
    const dynamo = await AwsDynamo.create(awsConfig);
    const accountId = await AccountIdTable.create(config, dynamo);
    const account = await AccountTable.create(config, dynamo);
    const deployment = await DeploymentTable.create(config, dynamo);
    const domain = await DomainTable.create(config, dynamo);
    const network = await NetworkTable.create(config, dynamo);
    const stack = await StackTable.create(config, dynamo);
    return new OpsDataTables(accountId, account, deployment, domain, network, stack);
  }

  private constructor(
    accountId: AccountIdTable,
    account: AccountTable,
    deployment: DeploymentTable,
    domain: DomainTable,
    network: NetworkTable,
    stack: StackTable
  ) {
    super([accountId, account, deployment, domain, network, stack]);
    this.accountId = accountId;
    this.account = account;
    this.deployment = deployment;
    this.domain = domain;
    this.network = network;
    this.stack = stack;
  }

  private accountId: AccountIdTable;
  private account: AccountTable;
  private deployment: DeploymentTable;
  private domain: DomainTable;
  private network: NetworkTable;
  private stack: StackTable;

  public get accountIdTable(): AccountIdTable {
    return this.accountId;
  }

  public get accountTable(): AccountTable {
    return this.account;
  }

  public get deploymentTable(): DeploymentTable {
    return this.deployment;
  }

  public get domainTable(): DomainTable {
    return this.domain;
  }

  public get networkTable(): NetworkTable {
    return this.network;
  }

  public get stackTable(): StackTable {
    return this.stack;
  }
}
