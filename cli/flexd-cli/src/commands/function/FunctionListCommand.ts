import { EOL } from 'os';
import { Command } from '@5qtrs/cli';

export class FunctionListCommand extends Command {
  private constructor() {
    super({
      name: 'List Functions',
      cmd: 'ls',
      summary: 'List deployed functions',
      description: [
        `Retrieves a list of deployed functions in the given boundary.${EOL}${EOL}If`,
        'the profile does not specify the subscription, or boundary, the relevant',
        `command options are required.${EOL}${EOL}A profile must have 'manage'`,
        'access to boundary to retrieve a list of deployed functions within it.',
      ].join(' '),
    });
  }

  public static async create() {
    return new FunctionListCommand();
  }
}
