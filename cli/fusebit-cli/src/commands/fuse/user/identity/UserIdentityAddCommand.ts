import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { AgentService, ExecuteService } from '../../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add User Identity',
  cmd: 'add',
  summary: 'Add an identity to a user',
  description: Text.create(
    "Adds an identity to a user. The user will be associated with all access tokens with the given '",
    Text.bold('iss'),
    "' (issuer) and '",
    Text.bold('sub'),
    "' (subject) claims."
  ),
  arguments: [
    {
      name: 'user',
      description: 'The id of the user to associate with the identity',
    },
    {
      name: 'issuer',
      description: 'The issuer claim from access tokens that will identify the user',
    },
    {
      name: 'subject',
      description: 'The subject claim from access tokens that will identify the user',
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

export class UserIdentityAddCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserIdentityAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, issuerId, subject] = input.arguments as string[];

    const userService = await AgentService.create(input, true);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const user = await userService.getAgent(id);

    const newIdentity = { issuerId, subject };

    await userService.confirmAddAgentIdentity(user, newIdentity);

    const update = { identities: [newIdentity] };
    if (user.identities) {
      update.identities.push(...user.identities);
    }

    const updatedUser = await userService.addAgentIdentity(user.id, update);

    await userService.displayAgent(updatedUser);

    return 0;
  }
}
