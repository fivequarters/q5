import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { UserService } from '../../services';

export class UserUpdateCommand extends Command {
  private constructor() {
    super({
      name: 'Update User',
      cmd: 'update',
      summary: 'Update a user',
      description: Text.create(
        'Updates the first name, last name or email of a user.',
        Text.eol(),
        Text.eol(),
        "To add or remove identities associated with the user, use the '",
        Text.bold('user identity'),
        "' commands and to add or remove access from the user, use the '",
        Text.bold('user access'),
        "' commands."
      ),
      arguments: [
        {
          name: 'user',
          description: 'The id of the user to update.',
        },
      ],
      options: [
        {
          name: 'first',
          description: 'The updated first name of the user.',
        },
        {
          name: 'last',
          description: 'The updated last name of the user.',
        },
        {
          name: 'email',
          description: 'The updated email for the user.',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding updating the user will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new UserUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const [id] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;
    const firstName = input.options.first as string;
    const lastName = input.options.last as string;
    const primaryEmail = input.options.email as string;

    const userService = await UserService.create(input);

    const user = await userService.getUser(id);

    const update = {
      firstName: firstName === '' ? undefined : firstName || user.firstName,
      lastName: lastName === '' ? undefined : lastName || user.lastName,
      primaryEmail: primaryEmail === '' ? undefined : primaryEmail || user.primaryEmail,
    };

    if (confirm) {
      await userService.confirmUpdateUser(user, update);
    }

    const updatedUser = await userService.updateUser(user.id, update);

    await userService.displayUser(updatedUser);

    return 0;
  }
}
