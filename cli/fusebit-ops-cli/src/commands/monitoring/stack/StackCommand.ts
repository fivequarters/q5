import { Command, ICommand } from '@5qtrs/cli';
import { PromoteStackCommand } from './PromoteStackCommand';
import { AddStackCommand } from './AddStackCommand';
import { DemoteStackCommand } from './DemoteStackCommand';
import { ListStackCommand } from './ListStackCommand';
import { RemoveStackCommand } from './RemoveStackCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Stack',
  cmd: 'stack',
  summary: 'Manage Fusebit Monitoring Stacks',
  description: 'Manage monitoring stacks on the Fusebit platform.',
};

// ----------------
// Exported Classes
// ----------------

export class StackCommand extends Command {
  public static async create() {
    const subCommands: any[] = [];
    subCommands.push(await AddStackCommand.create());
    subCommands.push(await PromoteStackCommand.create());
    subCommands.push(await DemoteStackCommand.create());
    subCommands.push(await ListStackCommand.create());
    subCommands.push(await RemoveStackCommand.create());
    command.subCommands = subCommands;
    return new StackCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
