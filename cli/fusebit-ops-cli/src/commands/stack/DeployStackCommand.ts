import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Deploy Stack',
  cmd: 'deploy',
  summary: 'Deploy a stack of a deployment',
  description: 'Deploys a new stack of a deployment to the Fusebit platform.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of the deployment',
    },
    {
      name: 'tag',
      description: 'The tag of the deployment to deploy',
    },
  ],
  options: [
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

export class DeployStackCommand extends Command {
  public static async create() {
    return new DeployStackCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName, tag] = input.arguments as string[];

    const stackService = await StackService.create(input);

    await stackService.deploy(deploymentName, tag);

    return 0;
  }
}
