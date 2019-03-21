import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class FunctionLogCommand extends Command {
  private constructor() {
    super({
      name: 'Log Functions',
      cmd: 'log',
      summary: 'Stream real-time function logs',
      description: [
        `Retrieves real-time streaming logs of all events from the function.${EOL}${EOL}If`,
        'the profile does not specify the subscription, boundary, or function, the relevant',
        `command options are required.${EOL}${EOL}A profile must have 'manage'`,
        'access to boundary to retrieve real-time streaming logs of event from the function.',
      ].join(' '),
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id to stream real-time logs from.',
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
      arguments: [],
      modes: [],
    });
  }

  public static async create() {
    return new FunctionLogCommand();
  }
}
