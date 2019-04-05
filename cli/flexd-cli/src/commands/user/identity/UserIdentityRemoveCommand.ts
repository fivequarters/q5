import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { UserService } from '../../../services';
import { Text } from '@5qtrs/text';

export class UserIdentityRemoveCommand extends Command {
  private constructor() {
    super({
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
          description: 'The id of the user from which to remove the associate with the identity.',
        },
        {
          name: 'iss',
          description: 'The issuer claim of access tokens that currently identify the user.',
        },
        {
          name: 'sub',
          description: 'The subject claim of access tokens that currently identify the user.',
        },
      ],
      options: [
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding adding the identity to the user will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new UserIdentityRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id, iss, sub] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);

    const user = await userService.getUser(id);

    const newIdentity = { iss, sub };

    if (confirm) {
      await userService.confirmAddUserIdentity(user, newIdentity);
    }

    const update = { identities: [newIdentity] };
    const updatedUser = await userService.addUserIdentity(user.id, update);

    await userService.displayUser(updatedUser);

    return 0;
  }
}
