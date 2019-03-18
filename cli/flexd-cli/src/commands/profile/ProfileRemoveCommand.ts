import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class ProfileRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Profile',
      cmd: 'rm',
      summary: 'Remove a local profile',
      description: [
        `Removes a locally stored profile.${EOL}${EOL}**Note: This command`,
        'is destructive and can not be undone.',
      ].join(' '),
      arguments: [
        {
          name: 'profileName',
          description: 'The name of the local profile to remove.',
        },
      ],
    });
  }

  public static async create() {
    return new ProfileRemoveCommand();
  }
}
