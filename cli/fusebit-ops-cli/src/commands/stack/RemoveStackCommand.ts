import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService, DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Stack',
  cmd: 'rm',
  summary: 'Remove a stack of a deployment',
  description: 'Removes an existing stack of a deployment on the Fusebit platform.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of the deployment',
    },
    {
      name: 'id',
      description: 'The stack id to remove',
      type: ArgType.integer,
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the deployment is not globally unique',
      defaultText: 'deployment region',
    },
    {
      name: 'force',
      description: 'If set to true, will remove even if the stack is active',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before removing the stack',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class RemoveStackCommand extends Command {
  public static async create() {
    return new RemoveStackCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const deploymentName = input.arguments[0] as string;
    const region = input.options.region as string;
    const id = input.arguments[1] as number;
    const confirm = input.options.confirm as boolean;
    const force = input.options.force as boolean;

    const deploymentService = await DeploymentService.create(input);
    const stackService = await StackService.create(input);

    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);
    let stack = await stackService.getStack(deploymentName, deployment.region, id);

    if (confirm) {
      await stackService.confirmRemoveStack(stack);
    }

    await stackService.remove(deploymentName, stack.region, id, force);

    return 0;
  }
}
