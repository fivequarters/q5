import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService, DeploymentService } from '../../services';
import { IOpsNewStack } from '@5qtrs/ops-data';

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
      name: 'env',
      description: 'Path to an .env file with additional environment variables for the stack',
    },
    {
      name: 'ami',
      description: 'AMI ID to use instead of the official Ubuntu AMI',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before deploying the stack',
      type: ArgType.boolean,
      default: 'true',
    },
    {
      name: 'disable-healthcheck',
      aliases: ['h'],
      description: 'Disable the health check of this stack, only use this when absolutely nessersary.',
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
    const disableHealthCheck = input.options['disable-healthcheck'] as boolean;
    const env = input.options.env as string;
    const ami = input.options.ami as string;

    const stackService = await StackService.create(input);
    const deploymentService = await DeploymentService.create(input);

    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);
    const newStack: IOpsNewStack = {
      deploymentName,
      tag,
      size: size || deployment.size,
      region: deployment.region,
      env,
      ami,
      disableHealthCheck,
    };

    if (confirm) {
      await stackService.confirmDeployStack(deployment, newStack);
    }

    newStack.env = env ? require('fs').readFileSync(require('path').join(process.cwd(), env), 'utf8') : undefined;

    const stack = await stackService.deploy(newStack);
    await stackService.waitForStack(stack, deployment);
    await stackService.displayStack(stack);

    return 0;
  }
}
