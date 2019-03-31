import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, UserService } from '../../../services';
import { Text } from '@5qtrs/text';

export class UserIdentityAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add User Identity',
      cmd: 'add',
      summary: 'Add an identity to a user',
      description: [
        `Adds an identity to a user. The user will be associated with`,
        "all access tokens with the given 'iss' (issuer) and 'sub' (subject) claims.",
      ].join(' '),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user to associate with the identity.',
        },
        {
          name: 'iss',
          description: 'The issuer claim of access tokens that will identify the user.',
        },
        {
          name: 'sub',
          description: 'The subject claim of access tokens that will identify the user.',
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
    return new UserIdentityAddCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [id, iss, sub] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    const user = await userService.getUser(id);
    if (!user) {
      executeService.verbose();
      return 1;
    }

    const newIdentity = { iss, sub };

    if (confirm) {
      const confirmed = await userService.confirmAddUserIdentity(user, newIdentity);
      if (!confirmed) {
        return 1;
      }
    }

    user.identities = user.identities || [];
    user.identities.push(newIdentity);

    const updatedUser = await userService.updateUser(user);
    if (!updatedUser) {
      executeService.verbose();
      return 1;
    }

    await executeService.result({
      header: 'User Identity Added',
      message: Text.create("User identity was successfully added to user '", Text.bold(user.id), "'"),
    });

    await userService.displayUser(user);

    return 0;
  }
}
