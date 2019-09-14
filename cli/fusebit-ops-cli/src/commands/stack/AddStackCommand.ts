import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService, DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Stack',
  cmd: 'add',
  summary: 'Add a stack to a deployment',
  description: 'Adds a new stack to a deployment to the Fusebit platform.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of the deployment',
    },
    {
      name: 'tag',
      description: 'The tag of the image to deploy',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the deployment is not globally unique',
      defaultText: 'deployment region',
    },
    {
      name: 'size',
      description: 'The number of instances to include in the stack',
      type: ArgType.integer,
      defaultText: 'deployment size',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before deploying the stack',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AddStackCommand extends Command {
  public static async create() {
    return new AddStackCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [deploymentName, tag] = input.arguments as string[];
    const region = input.options.region as string;
    const size = input.options.size as number;
    const confirm = input.options.confirm as boolean;

    const stackService = await StackService.create(input);
    const deploymentService = await DeploymentService.create(input);

    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);
    const newStack = {
      deploymentName,
      tag,
      size: size || deployment.size,
      region: deployment.region,
    };

    if (confirm) {
      await stackService.confirmDeployStack(newStack);
    }

    const stack = await stackService.deploy(newStack);
    await stackService.displayStack(stack);

    return 0;
  }
}
