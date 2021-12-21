import { Command, ICommand } from '@5qtrs/cli';
import { AddNetworkCommand } from './AddNetworkCommand';
import { ListNetworkCommand } from './ListNetworkCommand';
import { SetupNetworkCommand } from './SetupNetworkCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Manage Network',
  cmd: 'network',
  summary: 'Manage networks',
  description: 'Add and list networks',
};

// ----------------
// Exported Classes
// ----------------

export class NetworkCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddNetworkCommand.create());
    subCommands.push(await ListNetworkCommand.create());
    subCommands.push(await SetupNetworkCommand.create());
    command.subCommands = subCommands;
    return new NetworkCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
