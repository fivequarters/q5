import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService } from '../../services';

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
    const id = input.arguments[1] as number;
    const confirm = input.options.confirm as boolean;

    const stackService = await StackService.create(input);

    let stack = await stackService.getStack(deploymentName, id);

    if (!stack.active) {
      if (confirm) {
        await stackService.confirmPromoteStack(stack);
      }

      stack = await stackService.promote(deploymentName, id);
    }

    await stackService.displayStack(stack);

    return 0;
  }
}
