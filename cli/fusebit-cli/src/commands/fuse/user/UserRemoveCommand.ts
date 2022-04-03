import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove User',
  cmd: 'rm',
  summary: 'Remove a user',
  description: 'Removes the user and all acccess and identity associations of the user.',
  arguments: [
    {
      name: 'user',
      description: 'The id of the user to remove',
    },
  ],
  options: [
    {
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class UserRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const id = input.arguments[0] as string;

    const userService = await AgentService.create(input, true);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const user = await userService.getAgent(id);

    await userService.confirmRemoveAgent(id, user);

    await userService.removeAgent(id);

    return 0;
  }
}
