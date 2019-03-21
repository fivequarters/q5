import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class FunctionDeployCommand extends Command {
  private constructor() {
    super({
      name: 'Deploy Function',
      cmd: 'deploy',
      summary: 'Deploy a function',
      description: [
        'Builds and deploys a function with a given subscription id,',
        `boundary id, and function id.${EOL}${EOL}If the profile does not`,
        'specify the subscription, boundary, or function, the relevant',
        `command options are required.${EOL}${EOL}A profile must have 'manage'`,
        'access to a function to deploy it.',
      ].join(' '),
      arguments: [
        {
          name: 'source',
          description: [
            'A local path to the directory with the function source code to deploy.',
            `${EOL}${EOL}If not specified, the current working directory is used.`,
          ].join(' '),
          required: false,
        },
      ],
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id to deploy.',
          default: 'profile value',
        },
        {
          name: 'cron',
          description: 'A cron schedule to use to invoke the function.',
        },
        {
          name: 'timezone',
          description: 'The timezone to use when invoking the function with the cron schedule.',
          default: 'UTC',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding deploying the function will be displayed along with a',
            'prompt for confirmation.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'true',
        },
      ],

      modes: [],
    });
  }

  public static async create() {
    return new FunctionDeployCommand();
  }
}
