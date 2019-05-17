import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService, DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Promote Stack',
  cmd: 'promote',
  summary: 'Promote a stack of a deployment',
  description: 'Promotes an existing stack of a deployment on the Fusebit platform.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of the deployment',
    },
    {
      name: 'id',
      description: 'The stack id to promote',
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
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before promoting the stack',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class PromoteStackCommand extends Command {
  public static async create() {
    return new PromoteStackCommand();
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

    const deploymentService = await DeploymentService.create(input);
    const stackService = await StackService.create(input);

    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);
    let stack = await stackService.getStack(deploymentName, deployment.region, id);

    if (!stack.active) {
      if (confirm) {
        await stackService.confirmPromoteStack(stack);
      }

      stack = await stackService.promote(deploymentName, stack.region, id);
    }

    await stackService.displayStack(stack);

    return 0;
  }
}
