import { Command, ICommand } from '@5qtrs/cli';
import { GetWafCommand } from './GetWafCommand';
import { IPCommand } from './ip/IPCommand';

// ------------------
// Internal Constants
// ------------------

const commands: ICommand = {
  name: 'Waf',
  cmd: 'waf',
  summary: 'Update Fusebit WAF configuration',
  description: 'Update the configuration of Fusebit WAF.',
};

// ----------------
// Exported Classes
// ----------------

export class WafCommand extends Command {
  public static async create() {
    const subCommands: any[] = [];
    subCommands.push(await GetWafCommand.create());
    subCommands.push(await IPCommand.create());
    commands.subCommands = subCommands;
    return new WafCommand(commands);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
