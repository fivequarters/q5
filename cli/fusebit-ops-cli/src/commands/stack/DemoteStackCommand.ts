import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { StackService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Demote Stack',
  cmd: 'demote',
  summary: 'Demote a stack of a deployment',
  description: 'Demotes an existing stack of a deployment on the Fusebit platform.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of the deployment',
    },
    {
      name: 'id',
      description: 'The stack id to demote',
      type: ArgType.integer,
    },
  ],
  options: [
    {
      name: 'force',
      description: 'If set to true, will demote even if it is the last active stack',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before demoting the stack',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class DemoteStackCommand extends Command {
  public static async create() {
    return new DemoteStackCommand();
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

    if (stack.active) {
      if (confirm) {
        await stackService.confirmDemoteStack(stack);
      }

      stack = await stackService.demote(deploymentName, id, force);
    }
    await stackService.displayStack(stack);

    return 0;
  }
}
