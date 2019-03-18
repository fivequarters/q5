import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class FunctionGetCommand extends Command {
  private constructor() {
    super({
      name: 'Get Function',
      cmd: 'get',
      summary: 'Get a deployed function',
      description: [
        'Retrieves details of a deployed function with a given subscription id,',
        `boundary id, and function id.${EOL}${EOL}If the profile does not`,
        'specify the subscription, boundary, or function, the relevant',
        `command options are required.${EOL}${EOL}A profile must have 'manage'`,
        'access to function to retrieve it.',
      ].join(' '),
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id to retrieve.',
          default: 'profile value',
        },
        {
          name: 'download',
          description: [
            "If true, will download the function source code. If the 'source'",
            'option is not specified, the source code will downloaded to the current',
            'working directory.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'false',
        },
        {
          name: 'source',
          description: [
            'The directory to download the function source code to. If a valid directory is',
            "specified, the 'download' option is ignored.",
          ].join(' '),
          default: 'cwd',
        },
      ],
    });
  }

  public static async create() {
    return new FunctionGetCommand();
  }
}
