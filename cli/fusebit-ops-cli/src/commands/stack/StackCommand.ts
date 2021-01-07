import { Command, ICommand } from '@5qtrs/cli';
import { AddStackCommand } from './AddStackCommand';
import { ListStackCommand } from './ListStackCommand';
import { PromoteStackCommand } from './PromoteStackCommand';
import { DemoteStackCommand } from './DemoteStackCommand';
import { RemoveStackCommand } from './RemoveStackCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Stack',
  cmd: 'stack',
  summary: 'Manage stacks',
  description: 'Deploy, promote, demote, destroy and list stacks of deployments',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class StackCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddStackCommand.create());
    subCommands.push(await ListStackCommand.create());
    subCommands.push(await PromoteStackCommand.create());
    subCommands.push(await DemoteStackCommand.create());
    subCommands.push(await RemoveStackCommand.create());
    command.subCommands = subCommands;
    return new StackCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
