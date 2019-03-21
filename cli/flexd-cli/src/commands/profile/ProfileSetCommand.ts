import { Command } from '@5qtrs/cli';

export class ProfileSetCommand extends Command {
  private constructor() {
    super({
      name: 'Set Profile Value',
      cmd: 'set',
      summary: 'Set a command option on a local profile',
      description: 'Sets the given command options on a locally stored profile.',
      arguments: [
        {
          name: 'profileName',
          description: 'The name of the local profile to set option values on.',
        },
      ],
      options: [
        {
          name: 'account',
          aliases: ['a'],
          description: 'Set the account command option of the profile to the given account id.',
        },
        {
          name: 'subscription',
          aliases: ['s'],
          description: 'Set the subscription command option of the profile to the given subscription id.',
        },
        {
          name: 'boundary',
          aliases: ['b'],
          description: 'Set the boundary command option of the profile to the given boundary id.',
        },
        {
          name: 'function',
          aliases: ['f'],
          description: 'Set the function command option of the profile to the given function id.',
        },
      ],
    });
  }

  public static async create() {
    return new ProfileSetCommand();
  }
}
