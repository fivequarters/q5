import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Deployment',
  cmd: 'add',
  summary: 'Add a deployment',
  description: 'Adds a new deployment to the Fusebit platform.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the new deployment',
    },
    {
      name: 'network',
      description: 'The network to add the deployment to',
    },
    {
      name: 'domain',
      description: 'The domain where the deployment should be hosted',
    },
  ],
  options: [
    {
      name: 'size',
      description: 'The default number of instances to include in stacks of the deployment',
      type: ArgType.integer,
      default: '2',
    },
    {
      name: 'dataWarehouse',
      description: 'If set to true, the deployment will export data to the data warehouse',
      type: ArgType.boolean,
      default: 'true',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before adding the deployment to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AddDeploymentCommand extends Command {
  public static async create() {
    return new AddDeploymentCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName, networkName, domainName] = input.arguments as string[];
    const size = input.options.size as number;
    const confirm = input.options.confirm as boolean;
    const dataWarehouseEnabled = input.options.dataWarehouse as boolean;

    const deploymentService = await DeploymentService.create(input);

    const deployment = { deploymentName, networkName, domainName, size, dataWarehouseEnabled };
    await deploymentService.checkDeploymentExists(deployment);

    if (confirm) {
      await deploymentService.confirmAddDeployment(deployment);
    }

    const addedDeployment = await deploymentService.addDeployment(deployment);
    await deploymentService.displayDeployment(addedDeployment);

    return 0;
  }
}
