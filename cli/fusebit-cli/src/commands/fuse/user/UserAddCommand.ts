import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ExecuteService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add User',
  cmd: 'add',
  summary: 'Add a user',
  description: Text.create(
    'Adds a user with the given first and last name and email.',
    Text.eol(),
    Text.eol(),
    "Identities can be associated with the user using the '",
    Text.bold('user identity'),
    "' commands and access can be given to the user using the '",
    Text.bold('user access'),
    "' commands."
  ),
  arguments: [
    {
      name: 'first',
      description: 'The first name of the user',
    },
    {
      name: 'last',
      description: 'The last name of the user',
    },
    {
      name: 'email',
      description: 'The primary email for the user',
      required: false,
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

export class UserAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [firstName, lastName, primaryEmail] = input.arguments as string[];

    const userService = await AgentService.create(input, true);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const newUser = { firstName, lastName, primaryEmail };

    await userService.confirmAddAgent(newUser);

    const user = await userService.addAgent(newUser);

    await userService.displayAgent(user);

    return 0;
  }
}
