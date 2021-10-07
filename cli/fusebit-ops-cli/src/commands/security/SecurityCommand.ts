import { Command, ICommand } from '@5qtrs/cli';
import { WafCommand } from './waf/WafCommand';
// ------------------
// Internal Constants
// ------------------

const commands: ICommand = {
  name: 'Security',
  cmd: 'security',
  summary: 'Update Fusebit security configuration',
  description: 'Update the configuration of Fusebit WAF',
};

// ----------------
// Exported Classes
// ----------------

export class SecurityCommand extends Command {
  public static async create() {
    const subCommands: any[] = [];
    subCommands.push(await WafCommand.create());
    commands.subCommands = subCommands;
    return new SecurityCommand(commands);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
