import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class BoundaryLogCommand extends Command {
  private constructor() {
    super({
      name: 'Log Boundaries',
      cmd: 'log',
      summary: 'Stream real-time boundary logs',
      description: [
        `Retrieves the real-time streaming logs of all functions in the given boundary.${EOL}${EOL}If`,
        'the profile does not specify the subscription, or boundary, the relevant command options',
        `are required.${EOL}${EOL}A profile must have 'manage' access to the boundary to retrieve`,
        'real-time streaming logs of functions from the boundary.',
      ].join(' '),
      options: [
        {
          name: 'boundary',
          aliases: ['b'],
          description: 'The id of the boundary to stream real-time logs from.',
          default: 'profile value',
        },
        {
          name: 'format',
          description: [
            'The format of the log entries. Supported formats include:',
            " 'json', 'bunyan' and 'console'.",
          ].join(' '),
          default: 'console',
        },
      ],
    });
  }

  public static async create() {
    return new BoundaryLogCommand();
  }
}
