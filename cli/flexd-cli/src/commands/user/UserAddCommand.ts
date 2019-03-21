import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class UserAddCommand extends Command {
  private constructor() {
    super({
      name: 'Add User',
      cmd: 'add',
      summary: 'Add a user',
      description: [
        `Adds a user with the given first and last name and email.${EOL}${EOL}Identities can be`,
        "associated with the user using the 'user identity' commands and access can be given",
        "to the user using the 'user access' commands.",
      ].join(' '),
      options: [
        {
          name: 'first',
          description: 'The first name of the user.',
        },
        {
          name: 'last',
          description: 'The last name of the user.',
        },
        {
          name: 'email',
          description: 'The primary email for the user.',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding adding the user will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
  }

  public static async create() {
    return new UserAddCommand();
  }
}
