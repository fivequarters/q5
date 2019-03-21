import { EOL } from 'os';
import { Command, ArgType } from '@5qtrs/cli';

export class FunctionRemoveCommand extends Command {
  private constructor() {
    super({
      name: 'Remove Function',
      cmd: 'rm',
      summary: 'Remove a deployed function',
      description: [
        'Removes a deployed function with a given subscription id,',
        `boundary id, and function id.${EOL}${EOL}If the profile does not`,
        'specify the subscription, boundary, or function, the relevant',
        `command options are required.${EOL}${EOL}A profile must have 'manage'`,
        `access to function to remove it.${EOL}${EOL}This is a destructive action`,
        'and can not be undone.',
      ].join(' '),
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id of the function to remove.',
          default: 'profile value',
        },
        {
          name: 'confirm',
          description: [
            'If set to true, the details regarding removing the function will be displayed along with a',
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
    return new FunctionRemoveCommand();
  }
}
