import fs from 'fs';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { OpsService } from './OpsService';
import {
  IOpsDeployment,
  IOpsDeploymentParameters,
  IListOpsDeploymentOptions,
  IListOpsDeploymentResult,
  IFusebitSubscription,
  IFusebitAccount,
  IInitAdmin,
} from '@5qtrs/ops-data';
import { ExecuteService } from './ExecuteService';

// ----------------
// Exported Classes
// ----------------

export class DeploymentService {
  private input: IExecuteInput;
  private opsService: OpsService;
  private executeService: ExecuteService;

  private constructor(input: IExecuteInput, opsService: OpsService, executeService: ExecuteService) {
    this.input = input;
    this.opsService = opsService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    return new DeploymentService(input, opsService, executeService);
  }

  public async checkDeploymentExists(deployment: IOpsDeploymentParameters): Promise<IOpsDeployment> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    const exists = await this.executeService.execute(
      {
        header: 'Deployment Check',
        message: `Determining if the '${Text.bold(deployment.deploymentName)}' deployment already exists...`,
        errorHeader: 'Deployment Error',
      },
      () => deploymentData.existsAndUpdate(deployment)
    );

    if (exists) {
      this.executeService.warning(
        'Deployment Exists',
        `'${Text.bold(deployment.deploymentName)}' has been updated with the supplied parameters.`
      );
      throw new Error('Deployment already Exists');
    }

    return deployment as IOpsDeployment;
  }

  public async getElasticSearchTemplate(deployment: IOpsDeploymentParameters, outFile: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    if (fs.existsSync(outFile)) {
      this.executeService.error(
        'Target File Exists',
        `Cannot generate configuration in '${Text.bold(outFile)}': file exists.`
      );
      throw new Error('Target File Exists');
    }

    fs.writeFileSync(
      outFile,
      JSON.stringify(await deploymentData.getElasticSearchTemplate(deployment as IOpsDeployment), null, 2)
    );

    this.executeService.result(
      'File Created',
      `Customize '${Text.bold(outFile)}' before passing it as a parameter to --elasticSearch`
    );
  }

  public async confirmAddDeployment(deployment: IOpsDeployment) {
    const confirmPrompt = await Confirm.create({
      header: 'Add the deployment to the Fusebit platform?',
      details: [
        { name: 'Deployment', value: deployment.deploymentName },
        { name: 'Region', value: deployment.region },
        { name: 'Domain', value: deployment.domainName },
        { name: 'Network', value: deployment.networkName },
        { name: 'Size', value: deployment.size.toString() },
        { name: 'Elastic Search', value: deployment.elasticSearch },
        { name: 'DWH', value: deployment.dataWarehouseEnabled ? 'Enabled' : 'Disabled' },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Add Canceled',
        Text.create('Adding the deployment to the Fusebit platform was canceled')
      );
      throw new Error('Add Canceled');
    }
  }

  public async confirmAddSubscription(subscription: IFusebitSubscription) {
    const confirmPrompt = await Confirm.create({
      header: 'Add the deployment to the Fusebit platform?',
      details: [
        { name: 'Deployment', value: subscription.deploymentName },
        { name: 'Region', value: subscription.region },
        { name: 'Account', value: subscription.account || '<New Fusebit Account>' },
        { name: 'Account Name', value: subscription.accountName || '<Not set>' },
        { name: 'Account Email', value: subscription.accountEmail || '<Not set>' },
        { name: 'Subscription Name', value: subscription.subscriptionName || '<Not set>' },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Add Canceled',
        Text.create('Adding the subscription to the Fusebit platform was canceled')
      );
      throw new Error('Add Canceled');
    }
  }

  public async confirmInitAdmin(init: IInitAdmin) {
    const confirmPrompt = await Confirm.create({
      header: 'Create a new Fusebit user with administrative permissions?',
      details: [
        { name: 'Deployment', value: init.deploymentName },
        { name: 'Region', value: init.region },
        { name: 'Account', value: init.account },
        { name: 'Default Subscription', value: init.subscription || '<Not set>' },
        { name: 'First Name', value: init.first || '<Not set>' },
        { name: 'Last Name', value: init.last || '<Not set>' },
        { name: 'Email', value: init.email || '<Not set>' },
      ],
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.warning(
        'Create Canceled',
        Text.create('Creating a new Fusebit administrator was canceled')
      );
      throw new Error('Create Canceled');
    }
  }

  public async addDeployment(deployment: IOpsDeployment): Promise<IOpsDeployment> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    await this.executeService.execute(
      {
        header: 'Publish Deployment',
        message: `Publishing the '${Text.bold(deployment.deploymentName)}' deployment to the Fusebit platform...`,
        errorHeader: 'Deployment Error',
      },
      () => deploymentData.add(deployment)
    );

    this.executeService.result(
      'Deployment Added',
      `The '${Text.bold(deployment.deploymentName)}' deployment was successfully added to Fusebit platform`
    );

    return deployment;
  }

  public async addSubscription(subscription: IFusebitSubscription): Promise<IFusebitSubscription> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    await this.executeService.execute(
      {
        header: 'Add Subscription',
        message: `Adding a new subscription in the '${Text.bold(
          subscription.deploymentName
        )}' deployment to the Fusebit platform...`,
        errorHeader: 'Subscription Error',
      },
      () => deploymentData.addSubscription(subscription)
    );

    this.executeService.result(
      'Subscription Added',
      `A new subscription in the '${Text.bold(
        subscription.deploymentName
      )}' deployment was successfully added to Fusebit platform`
    );

    return subscription as IFusebitSubscription;
  }

  public async initAdmin(deployment: IOpsDeployment, init: IInitAdmin): Promise<IInitAdmin> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    await this.executeService.execute(
      {
        header: 'Create Fusebit Admin',
        message: `Creating a new administrator of the '${init.account}' account in the '${Text.bold(
          init.deploymentName
        )}' deployment...`,
        errorHeader: 'Create Fusebit Admin Error',
      },
      () => deploymentData.initAdmin(deployment, init)
    );

    this.executeService.result(
      'Admin Added',
      `A new administrator of the '${Text.bold(init.account)}' account was created`
    );

    return init;
  }

  public async getDeployment(name: string, region: string): Promise<IOpsDeployment> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    const network = await this.executeService.execute(
      {
        header: 'Get Deployment',
        message: `Getting the '${Text.bold(name)}' deployment in region '${Text.bold(region)}'...`,
        errorHeader: 'Deployment Error',
      },
      () => deploymentData.get(name, region)
    );

    return network as IOpsDeployment;
  }

  public async getSingleDeployment(deploymentName: string, region?: string): Promise<IOpsDeployment> {
    const deployments = await this.getDeployments(deploymentName);
    if (!deployments || deployments.length === 0) {
      await this.executeService.error(
        'No Deployment',
        Text.create(`There are no deployments with the name '${Text.bold(deploymentName)}'`)
      );
      throw new Error('No such deployment');
    }
    if (deployments.length > 1) {
      if (!region) {
        await this.executeService.error(
          'Many Deployments',
          Text.create(`There is more than one '${Text.bold(deploymentName)}' deployment. You must specify the region.'`)
        );
        throw new Error('Unspecified deployment');
      }

      for (const deployment of deployments) {
        if (deployment.region === region) {
          return deployment;
        }
      }
      await this.executeService.error(
        'No Deployment',
        Text.create(`There is no '${Text.bold(deploymentName)}' deployment in region '${Text.bold(region)}'`)
      );
      throw new Error('No such deployment');
    }

    return deployments[0];
  }

  public async getDeployments(deploymentName: string): Promise<IOpsDeployment[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    const deployments = await this.executeService.execute(
      {
        header: 'Get Deployments',
        message: `Getting deployments with the '${Text.bold(deploymentName)}' name...`,
        errorHeader: 'Deployment Error',
      },
      () => deploymentData.listAll(deploymentName)
    );

    return deployments as IOpsDeployment[];
  }

  public async listAllDeployments(): Promise<IOpsDeployment[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    const result = await this.executeService.execute(
      {
        header: 'Get Deployments',
        message: `Getting the deployments on the Fusebit platform...`,
        errorHeader: 'Deployment Error',
      },
      () => deploymentData.listAll()
    );
    return result as IOpsDeployment[];
  }

  public async listAllSubscriptions(deployment: IOpsDeployment): Promise<IFusebitAccount[]> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    const result = await this.executeService.execute(
      {
        header: 'Get Subscriptions',
        message: `Getting the subscriptions on the Fusebit platform...`,
        errorHeader: 'Subscription Error',
      },
      () => deploymentData.listAllSubscriptions(deployment)
    );
    return result as IFusebitAccount[];
  }

  public async listDeployments(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    const messages =
      options && options.next
        ? {}
        : {
            header: 'Get Deployments',
            message: `Getting the deployments on the Fusebit platform...`,
            errorHeader: 'Deployment Error',
          };

    const result = await this.executeService.execute(messages, () => deploymentData.list(options));
    return result as IListOpsDeploymentResult;
  }

  public async confirmListMore(): Promise<boolean> {
    const confirmPrompt = await Confirm.create({ header: 'Get More Deployments?' });
    return confirmPrompt.prompt(this.input.io);
  }

  public async displaySubscriptions(deployment: IOpsDeployment, accounts: IFusebitAccount[]) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(accounts, null, 2));
      return;
    }

    if (accounts.length == 0) {
      await this.executeService.warning(
        'No Fusebit Accounts',
        `There are no fusebit accounts on the ${deployment.deploymentName} deployment`
      );
      return;
    }

    await this.executeService.message(Text.cyan('Fusebit Account'), Text.cyan('Details'));
    for (const account of accounts) {
      this.writeAccount(account);
    }
  }

  public async displayInit(init: IInitAdmin) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(init, null, 2));
      return;
    }

    await this.executeService.message(
      Text.cyan('Init Token'),
      Text.create([
        'Provide the following init token to the Fusebit administrator. It is a single use token that will expire in 8 hours.',
        Text.eol(),
        'Have the administrator execute the following command:',
      ])
    );
    console.log(`fuse init ${init.initToken}`);
  }

  private async writeAccount(account: IFusebitAccount) {
    let details: (Text | string)[] = [
      Text.dim('Name: '),
      account.displayName || '<Not set>',
      Text.eol(),
      Text.dim('ID: '),
      account.id,
      Text.eol(),
      Text.dim('Email: '),
      account.primaryEmail || '<Not set>',
      Text.eol(),
      Text.eol(),
    ];
    if (account.subscriptions.length === 0) {
      details.push(Text.dim('<No subscriptions>'));
    } else {
      account.subscriptions.forEach((s) => {
        details.push(
          Text.dim('Subscription ID: '),
          s.id,
          Text.eol(),
          Text.dim('Subscription Name: '),
          s.displayName || '<Not set>',
          Text.eol(),
          Text.eol()
        );
      });
    }

    await this.executeService.message(Text.bold(account.id), Text.create(details));
  }

  public async displayDeployments(deployments: IOpsDeployment[]) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(deployments, null, 2));
      return;
    }

    if (deployments.length == 0) {
      await this.executeService.warning('No Deployments', 'There are no deployments on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.cyan('Deployment'), Text.cyan('Details'));
    for (const deployment of deployments) {
      this.writeDeployments(deployment);
    }
  }

  public async displayDeployment(deployment: IOpsDeployment) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(deployment, null, 2));
      return;
    }

    await this.executeService.message(Text.cyan('Deployment'), Text.cyan('Details'));
    this.writeDeployments(deployment);
  }

  private async writeDeployments(deployment: IOpsDeployment) {
    const details = [
      Text.dim('Region: '),
      deployment.region,
      Text.eol(),
      Text.dim('Domain: '),
      deployment.domainName,
      Text.eol(),
      Text.dim('Network: '),
      deployment.networkName,
      Text.eol(),
      Text.dim('Default Size: '),
      deployment.size != undefined ? deployment.size.toString() : '',
      Text.eol(),
      Text.dim('Elastic Search: '),
      deployment.elasticSearch ? deployment.elasticSearch.toString() : '',
      Text.eol(),
      Text.dim('fuse-ops Version: '),
      deployment.fuseopsVersion ? deployment.fuseopsVersion : '',
      Text.eol(),
      Text.dim('Data Warehouse: '),
      deployment.dataWarehouseEnabled ? 'Enabled' : 'Disabled',
      Text.eol(),
      Text.dim('Base URL: '),
      `https://${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`,
    ];

    await this.executeService.message(Text.bold(deployment.deploymentName), Text.create(details));
  }

  public async displaySubscription(subscription: IFusebitSubscription) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(subscription, null, 2));
      return;
    }

    await this.executeService.message(Text.cyan('Subscription'), Text.cyan('Details'));
    this.writeSubscription(subscription);
  }

  private async writeSubscription(subscription: IFusebitSubscription) {
    const details = [
      Text.dim('Subscription ID: '),
      subscription.subscription as string,
      Text.eol(),
      Text.dim('Account ID: '),
      subscription.account as string,
      Text.eol(),
      Text.dim('Account Name: '),
      subscription.accountName || '<Not set>',
      Text.eol(),
      Text.dim('Account Email: '),
      subscription.accountEmail || '<Not set>',
      Text.eol(),
      Text.dim('Deployment: '),
      subscription.deploymentName,
      Text.eol(),
      Text.dim('Region: '),
      subscription.region,
    ];

    await this.executeService.message(
      Text.bold((subscription.subscriptionName || subscription.subscription) as string),
      Text.create(details)
    );
  }
}
