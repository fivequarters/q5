import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { UserService, ExecuteService } from '../../services';

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
          aliases: ['f'],
          description: 'The updated first name of the user',
        },
        {
          name: 'last',
          aliases: ['l'],
          description: 'The updated last name of the user',
        },
        {
          name: 'email',
          aliases: ['e'],
          description: 'The updated email for the user',
        },
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
    });
  }

  public static async create() {
    return new UserUpdateCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [id] = input.arguments as string[];
    const firstName = input.options.first as string;
    const lastName = input.options.last as string;
    const primaryEmail = input.options.email as string;

    const userService = await UserService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const user = await userService.getUser(id);

    const update = {
      firstName: firstName === '' ? undefined : firstName || user.firstName,
      lastName: lastName === '' ? undefined : lastName || user.lastName,
      primaryEmail: primaryEmail === '' ? undefined : primaryEmail || user.primaryEmail,
    };

    await userService.confirmUpdateUser(user, update);

    const updatedUser = await userService.updateUser(user.id, update);

    await userService.displayUser(updatedUser);

    return 0;
  }
}
