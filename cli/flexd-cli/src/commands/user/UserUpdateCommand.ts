import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class UserUpdateCommand extends Command {
  private constructor() {
    super({
      name: 'Update User',
      cmd: 'update',
      summary: 'Update a user',
      description: [
        "Updates a user with the given user id. Only the user's first name, last name and email",
        `can be updated.${EOL}${EOL}To add or remove identities associated with the user, use the 'user identity'`,
        `commands.${EOL}${EOL}To add or remove access from the user, use the 'user access' commands.`,
      ].join(' '),
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
}
