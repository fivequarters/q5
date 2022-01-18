import { Command, ICommand } from '@5qtrs/cli';
import { PromoteStackCommand } from '../../stack/PromoteStackCommand';
import { AddStackCommand } from './AddStackCommand';
import { DemoteStackCommand } from './DemoteStackCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Stack',
  cmd: 'stack',
  summary: 'Manage Fusebit Monitoring stacks',
  description: 'Manage Fusebit monitoring stacks',
};

// ----------------
// Exported Classes
// ----------------

export class StackCommand extends Command {
  public static async create() {
    // WTF vscode
    const subCommands: any[] = [];
    subCommands.push(await AddStackCommand.create());
    subCommands.push(await PromoteStackCommand.create());
    subCommands.push(await DemoteStackCommand.create());
    command.subCommands = subCommands;
    return new StackCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
