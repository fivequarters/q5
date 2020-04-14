import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Update Deployments',
  cmd: 'update',
  summary: 'Updates a deployments default values',
  description: 'Changes the default values in a deployment that are propagated by default to stacks on creation.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the deployment to update',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },
    {
      name: 'size',
      description: 'The default number of instances to include in stacks of the deployment',
      type: ArgType.integer,
      default: '2',
    },
    {
      name: 'elasticSearch',
      description: 'The Elastic Search endpoint for monitoring and analytics\nFormat: https://user:password@hostname',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class UpdateDeploymentCommand extends Command {
  public static async create() {
    return new UpdateDeploymentCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    // Collect the inputs
    const [name] = input.arguments as string[];
    const region = input.options.region as string;

    const size = input.options.size as number;
    const elasticSearch = input.options.elasticSearch as string;

    // Get the specified deployment artifact
    const deploymentService = await DeploymentService.create(input);
    const deployment = await deploymentService.getSingleDeployment(name, region);

    // Update
    await deploymentService.updateDeployment(deployment, { size, elasticSearch });
    return 0;
  }
}
