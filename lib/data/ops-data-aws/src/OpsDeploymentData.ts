import { DataSource } from '@5qtrs/data';
import {
  IOpsDeploymentData,
  IOpsDeployment,
  IOpsDeploymentParameters,
  IListOpsDeploymentOptions,
  IListOpsDeploymentResult,
  OpsDataException,
  OpsDataExceptionCode,
  IFusebitSubscription,
  IFusebitAccount,
  IInitAdmin,
} from '@5qtrs/ops-data';
import { IListAccountsOptions, IListSubscriptionsOptions } from '@5qtrs/account-data';
import { AccountDataAwsContextFactory } from '@5qtrs/account-data-aws';
import { StorageDataAwsContextFactory } from '@5qtrs/storage-data-aws';
import { OpsDataTables } from './OpsDataTables';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { OpsAlb } from './OpsAlb';
import { createFunctionStorage } from './OpsFunctionStorage';
import { createAnalyticsPipeline } from './OpsAnalytics';
import { createCron } from './OpsCron';
import { createDwhExport } from './OpsDwh';
import { createLogsTable } from './OpsLogs';
import { debug } from './OpsDebug';
import { random } from '@5qtrs/random';
import { signJwt } from '@5qtrs/jwt';
import { parseElasticSearchUrl } from './OpsElasticSearch';

// ----------------
// Exported Classes
// ----------------

export class OpsDeploymentData extends DataSource implements IOpsDeploymentData {
  public static async create(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    tables: OpsDataTables,
    globalOpsDeploymentData?: OpsDeploymentData
  ) {
    return new OpsDeploymentData(config, provider, tables, globalOpsDeploymentData);
  }

  private config: OpsDataAwsConfig;
  private tables: OpsDataTables;
  private provider: OpsDataAwsProvider;
  private globalOpsDeploymentData?: OpsDeploymentData;

  private constructor(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    tables: OpsDataTables,
    globalOpsDeploymentData?: OpsDeploymentData
  ) {
    super([]);
    this.config = config;
    this.tables = tables;
    this.provider = provider;
    this.globalOpsDeploymentData = globalOpsDeploymentData;
  }

  public async existsAndUpdate(deployment: IOpsDeploymentParameters): Promise<boolean> {
    try {
      const existing = await this.tables.deploymentTable.get(deployment.deploymentName, deployment.region);
      if (existing.domainName !== deployment.domainName) {
        throw OpsDataException.deploymentDifferentDomain(deployment.deploymentName, existing.domainName);
      }

      if (existing.networkName !== deployment.networkName) {
        throw OpsDataException.deploymentDifferentNetwork(deployment.deploymentName, existing.networkName);
      }

      // Protect certain variables from accidentally being cleared or reset - treat unspecified as 'false'.
      deployment.featureUseDnsS3Bucket = !!existing.featureUseDnsS3Bucket;

      if (deployment.size == null || deployment.size < 1) {
        deployment.size = existing.size;
      }

      if (deployment.dataWarehouseEnabled == null) {
        deployment.dataWarehouseEnabled = existing.dataWarehouseEnabled;
      }

      if (deployment.elasticSearch == null) {
        deployment.elasticSearch = existing.elasticSearch;
      }

      // Update an existing deployment to any new parameters
      await this.ensureDeploymentSetup(deployment as IOpsDeployment);

      // Update the table with the latest values
      await this.tables.deploymentTable.update(deployment as IOpsDeployment);

      return true;
    } catch (error) {
      if (error.code === OpsDataExceptionCode.noDeployment) {
        // Specify any missing parameters on the deployment object
        if (deployment.size == null) {
          deployment.size = 2;
        }

        if (deployment.dataWarehouseEnabled == null) {
          deployment.dataWarehouseEnabled = true;
        }

        if (deployment.elasticSearch == null) {
          deployment.elasticSearch = '';
        }

        return false;
      }
      throw error;
    }
  }

  public async add(deployment: IOpsDeployment): Promise<void> {
    // Create the entry in the table.
    await this.tables.deploymentTable.add(deployment);
    try {
      await this.ensureDeploymentSetup(deployment);
    } catch (error) {
      await this.tables.deploymentTable.delete(deployment.deploymentName, deployment.region);
      throw error;
    }
  }

  public async addSubscription(subscription: IFusebitSubscription): Promise<void> {
    debug('ADD SUBSCRIPTION', subscription);
    const awsConfig = await this.provider.getAwsConfigForDeployment(subscription.deploymentName, subscription.region);

    const accountDataFactory = await AccountDataAwsContextFactory.create(awsConfig);
    const accountData = await accountDataFactory.create(this.config);
    let accountCreated = false;
    if (subscription.account) {
      debug(`Getting existing Fusebit account ${subscription.account}...`);
      // ensure fusebit account exists
      const account = await accountData.accountData.get(subscription.account);
      subscription.accountName = account.displayName;
      subscription.accountEmail = account.primaryEmail;
      debug(`Got existing Fusebit account`, account);
    } else {
      debug('Creating new Fusebit account...');
      // create fusebit account for subscription
      const account = await accountData.accountData.add({
        id: `acc-${random({ lengthInBytes: 8 })}`,
        displayName: subscription.accountName,
        primaryEmail: subscription.accountEmail,
      });
      subscription.account = account.id;
      accountCreated = true;
      debug(`Created new Fusebit account ${account.id}`);
    }

    try {
      const newSubscription = await accountData.subscriptionData.add(subscription.account as string, {
        id: `sub-${random({ lengthInBytes: 8 })}`,
        displayName: subscription.subscriptionName,
      });
      subscription.subscription = newSubscription.id;
    } catch (e) {
      if (accountCreated) {
        await accountData.accountData.delete(subscription.account as string);
      }
      throw e;
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

  public async listAllSubscriptions(deployment: IOpsDeployment): Promise<IFusebitAccount[]> {
    debug('LIST SUBSCRIPTIONS', deployment);
    const awsConfig = await this.provider.getAwsConfigForDeployment(deployment.deploymentName, deployment.region);

    const accountDataFactory = await AccountDataAwsContextFactory.create(awsConfig);
    const accountData = await accountDataFactory.create(this.config);

    let accounts: IFusebitAccount[] = [];
    let listAccountOptions: IListAccountsOptions = {};
    do {
      let partialAccountResult = await accountData.accountData.list(listAccountOptions);
      for (let i of partialAccountResult.items) {
        let newAccount = {
          id: i.id as string,
          displayName: i.displayName,
          primaryEmail: i.primaryEmail,
          subscriptions: [],
        };
        accounts.push(newAccount);
        let listSubscriptionOptions: IListSubscriptionsOptions = {};
        do {
          debug(`Listing subcriptions for account ${newAccount.id}...`);
          let partialSubscriptionResult = await accountData.subscriptionData.list(
            newAccount.id,
            listSubscriptionOptions
          );
          debug(`Listed subscriptions: `, partialSubscriptionResult.items);
          newAccount.subscriptions.push.apply(newAccount.subscriptions, partialSubscriptionResult.items as never[]);
          listSubscriptionOptions.next = partialSubscriptionResult.next;
        } while (listSubscriptionOptions.next);
        //@ts-ignore
        newAccount.subscriptions.sort((a, b) => (a <= b ? -1 : 1));
      }
      listAccountOptions.next = partialAccountResult.next;
    } while (listAccountOptions.next);
    //@ts-ignore
    accounts.sort((a, b) => (a <= b ? -1 : 1));

    return accounts;
  }

  public async initAdmin(deployment: IOpsDeployment, init: IInitAdmin): Promise<IInitAdmin> {
    debug('CREATING ADMIN', init);
    const awsConfig = await this.provider.getAwsConfigForDeployment(init.deploymentName, init.region);

    const accountDataFactory = await AccountDataAwsContextFactory.create(awsConfig);
    const accountData = await accountDataFactory.create(this.config);

    // Ensure account and subscription exist

    await accountData.accountData.get(init.account);
    if (init.subscription) {
      await accountData.subscriptionData.get(init.account, init.subscription);
    }

    // Create user with admin permissions

    let admin = await accountData.userData.add(init.account, {
      id: `usr-${random({ lengthInBytes: 8 })}`,
      firstName: init.first,
      lastName: init.last,
      primaryEmail: init.email,
      access: {
        allow: [
          {
            resource: `/account/${init.account}/`,
            action: '*',
          },
        ],
      },
    });

    // Create init token

    try {
      const jwtSecret = random({ lengthInBytes: 32 }) as string;
      await accountData.agentData.init(init.account, admin.id as string, jwtSecret);

      let fullBaseDomain = `${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`;
      let baseUrl = `https://${fullBaseDomain}`;
      const payload = {
        accountId: init.account,
        agentId: admin.id as string,
        subscriptionId: init.subscription || undefined,
        boundaryId: undefined,
        functionId: undefined,
        baseUrl: baseUrl,
        issuerId: `${random({ lengthInBytes: 4 })}.${admin.id}.${fullBaseDomain}`,
        subject: `cli-${random({ lengthInBytes: 4 })}`,
        iss: baseUrl,
        aud: baseUrl,
      };

      const options = {
        algorithm: 'HS256',
        expiresIn: 60 * 60 * 8, // 8h
      };

      init.initToken = await signJwt(payload, jwtSecret, options);
    } catch (e) {
      await accountData.userData.delete(init.account, admin.id as string);
      throw e;
    }

    return init;
  }

  private async ensureDeploymentSetup(deployment: IOpsDeployment): Promise<void> {
    debug('ENSURE DEPLOYMENT SETUP', deployment);

    // Validate the correctness of the parameters
    //
    // Check if the elasticSearch parameter is present and not-empty.
    if (deployment.elasticSearch && deployment.elasticSearch.length > 0) {
      // Validate that the Elastic Search parameter fits the expected format
      let esCreds = parseElasticSearchUrl(deployment.elasticSearch);
      if (!esCreds) {
        throw OpsDataException.invalidElasticSearchUrl(deployment.elasticSearch);
      }
    }

    const awsConfig = await this.provider.getAwsConfigForDeployment(deployment.deploymentName, deployment.region);

    await createFunctionStorage(this.config, awsConfig, deployment);

    const accountDataFactory = await AccountDataAwsContextFactory.create(awsConfig);
    const accountData = await accountDataFactory.create(this.config);
    await accountData.setup();

    const storageDataFactory = await StorageDataAwsContextFactory.create(awsConfig);
    const storageData = await storageDataFactory.create(this.config);
    await storageData.setup();

    await createLogsTable(this.config, awsConfig);

    await createAnalyticsPipeline(this.config, awsConfig, this.provider, this.tables, deployment);

    await createCron(this.config, awsConfig, this.provider, this.tables, deployment);
    if (deployment.dataWarehouseEnabled) {
      await createDwhExport(this.config, awsConfig, deployment);
    }

    const awsAlb = await OpsAlb.create(
      this.config,
      this.provider,
      this.tables,
      this.globalOpsDeploymentData && this.globalOpsDeploymentData.provider
    );
    await awsAlb.addAlb(deployment);
  }
}
