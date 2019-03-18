import { Command } from '@5qtrs/cli';

export class ProfileCopyCommand extends Command {
  private constructor() {
    super({
      name: 'Copy Profile',
      cmd: 'cp',
      summary: 'Copy a local profile',
      description: [
        'Creates a new locally stored profile by copying the credentials and',
        'and configured command options of an existing stored profile.',
      ].join(' '),
      arguments: [
        {
          name: 'profileName',
          description: 'The name of the local profile to copy.',
        },
        {
          name: 'newProfileName',
          description: 'The name of the new local profile to create.',
        },
      ],
    });
  }

  public static async create() {
    return new ProfileCopyCommand();
  }
}
