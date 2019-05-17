import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { OpsService } from './OpsService';
import { IOpsDeployment, IListOpsDeploymentOptions, IListOpsDeploymentResult } from '@5qtrs/ops-data';
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

  public async checkDeploymentExists(deployment: IOpsDeployment): Promise<void> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    const exists = await this.executeService.execute(
      {
        header: 'Deployment Check',
        message: `Determining if the '${Text.bold(deployment.deploymentName)}' deployment already exists...`,
        errorHeader: 'Deployment Error',
      },
      () => deploymentData.exists(deployment)
    );

    if (exists) {
      this.executeService.warning(
        'Deployment Exists',
        `There is already a '${Text.bold(deployment.deploymentName)}' deployment`
      );
      throw Error('Deployment already Exists');
    }
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

  public async addDeployment(deployment: IOpsDeployment): Promise<IOpsDeployment> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;

    await this.executeService.execute(
      {
        header: 'Add Deployment',
        message: `Adding the '${Text.bold(deployment.deploymentName)}' deployment to the Fusebit platform...`,
        errorHeader: 'Deployment Error',
      },
      () => deploymentData.add(deployment)
    );

    this.executeService.result(
      'Deployment Added',
      `The '${Text.bold(deployment.deploymentName)}' deployment was successfully added to Fusebit platform`
    );

    return deployment as IOpsDeployment;
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
          Text.create(`There is more than one '${Text.bold(deploymentName)}' deployment. You must sepcify the region.'`)
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

  public async displayDeployments(deployments: IOpsDeployment[]) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(deployments, null, 2));
      return;
    }

    if (deployments.length == 0) {
      await this.executeService.warning('No Deployments', 'There are no deployments on the Fusebit platform');
      return;
    }

    await this.executeService.message(Text.blue('Deployment'), Text.blue('Details'));
    for (const deployment of deployments) {
      this.writeDeployments(deployment);
    }
  }

  public async displayDeployment(deployment: IOpsDeployment) {
    if (this.input.options.format === 'json') {
      this.input.io.writeLine(JSON.stringify(deployment, null, 2));
      return;
    }

    await this.executeService.message(Text.blue('Deployment'), Text.blue('Details'));
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
      deployment.size.toString(),
      Text.eol(),
      Text.dim('Data Warehouse: '),
      deployment.dataWarehouseEnabled ? 'Enabled' : 'Disabled',
    ];

    await this.executeService.message(Text.bold(deployment.deploymentName), Text.create(details));
  }
}
