import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class ProfileListCommand extends Command {
  private constructor() {
    super({
      name: 'List Profiles',
      cmd: 'ls',
      summary: 'List local profiles',
      description: [
        `Returns a list of locally stored profiles.${EOL}${EOL}Use`,
        'the command options below to filter the list of profiles.',
        `Filters are combined using a logical OR.${EOL}${EOL}The default`,
        'profile command options are not applied when executing this',
        'command.',
      ].join(' '),
      options: [
        {
          name: 'contains',
          aliases: ['c'],
          description: 'List profiles with the given text in the profile name.',
          allowMany: true,
        },
        {
          name: 'account',
          aliases: ['a'],
          description: 'List profiles with the given account id.',
          allowMany: true,
        },
        {
          name: 'subscription',
          aliases: ['s'],
          description: 'List profiles with the given subscription id.',
          allowMany: true,
        },
      ],
    });
  }

  public static async create() {
    return new ProfileListCommand();
  }
}
