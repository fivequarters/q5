import { Command, ICommand } from '@5qtrs/cli';
import { GetWafCommand } from './GetWafCommand';
import { IPCommand } from './ip/IPCommand';
import { RegExCommand } from './regex/RegExCommand';

// ------------------
// Internal Constants
// ------------------

const commands: ICommand = {
  name: 'Waf',
  cmd: 'waf',
  summary: 'manage Fusebit WAF configuration',
  description: 'Manage the configuration of Fusebit WAF.',
};

// ----------------
// Exported Classes
// ----------------

export class WafCommand extends Command {
  public static async create() {
    const subCommands: any[] = [];
    subCommands.push(await GetWafCommand.create());
    subCommands.push(await IPCommand.create());
    subCommands.push(await RegExCommand.create());
    commands.subCommands = subCommands;
    return new WafCommand(commands);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
