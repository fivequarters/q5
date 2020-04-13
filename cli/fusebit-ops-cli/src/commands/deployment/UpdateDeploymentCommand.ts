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
      alaises: ['r'],
      description: 'The region of the deployment to update',
    },
    {
      name: 'size',
      aliases: ['s'],
      description: "Update the default 'size' of a stack, changing the number of hosts created",
      type: ArgType.integer,
      default: '2',
    },
    {
      name: 'elasticSearch',
      aliases: ['es'],
      description: 'Update the default Elastic Search endpoint for monitoring and analytics',
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
