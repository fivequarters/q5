import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, AgentService } from '../../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove User Identity',
  cmd: 'rm',
  summary: 'Removes an identity from a user',
  description: Text.create(
    "Removes an identity from a user. The user will no longer be associated with access tokens with the given '",
    Text.bold('iss'),
    "' (issuer) and '",
    Text.bold('sub'),
    "' (subject) claims."
  ),
  arguments: [
    {
      name: 'user',
      description: 'The id of the user from which to remove the associated identity',
    },
    {
      name: 'issuer',
      description: 'The issuer claim from access tokens that currently identify the user',
    },
    {
      name: 'subject',
      description: 'The subject claim from access tokens that currently identify the user',
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

export class UserIdentityRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new UserIdentityRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id, issuerId, subject] = input.arguments as string[];

    const userService = await AgentService.create(input, true);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const user = await userService.getAgent(id);
    user.identities = user.identities || [];

    let identityIndex = -1;
    for (let i = 0; i < user.identities.length; i++) {
      const identity = user.identities[i];
      if (identity.issuerId === issuerId && identity.subject === subject) {
        identityIndex = i;
        i = user.identities.length;
      }
    }

    if (identityIndex === -1) {
      await executeService.error(
        'No Identity',
        Text.create(
          "The user '",
          Text.bold(user.id),
          "' does not have an identity with an issuer of '",
          Text.bold(issuerId),
          "' and a subject of '",
          Text.bold(subject),
          "'"
        )
      );
    }

    const identity = { issuerId, subject };

    await userService.confirmRemoveAgentIdentity(user, identity);

    user.identities.splice(identityIndex, 1);

    const update = { identities: user.identities };
    const updatedUser = await userService.removeAgentIdentity(user.id, update);

    await userService.displayAgent(updatedUser);

    return 0;
  }
}
