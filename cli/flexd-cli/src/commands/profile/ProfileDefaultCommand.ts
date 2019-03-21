import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class ProfileDefaultCommand extends Command {
  private constructor() {
    super({
      name: 'Set Default Profile',
      cmd: 'default',
      summary: 'Get or set the default local profile',
      description: [
        "Returns the name of the current default local profile if the 'profileName' argument",
        `is not specified.${EOL}${EOL}Sets the locally stored default profile`,
        "if the 'profileName' argument is specified.",
      ].join(' '),
      arguments: [
        {
          name: 'profileName',
          description: 'The name of the local profile to use as the default.',
          required: false,
        },
      ],
    });
  }

  public static async create() {
    return new ProfileDefaultCommand();
  }
}
