import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService } from '../../services';

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
    const id = input.arguments[1] as number;
    const confirm = input.options.confirm as boolean;
    const force = input.options.force as boolean;

    const stackService = await StackService.create(input);

    let stack = await stackService.getStack(deploymentName, id);

    if (confirm) {
      await stackService.confirmRemoveStack(stack);
    }

    await stackService.remove(deploymentName, id, force);

    return 0;
  }
}
