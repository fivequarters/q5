import { Command, ICommand } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/fusebit-ops-core';
import { AddNetworkCommand } from './AddNetworkCommand';
import { ListNetworkCommand } from './ListNetworkCommand';

// ----------------
// Exported Classes
// ----------------

export class NetworkCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    const subCommands = [];
    subCommands.push(await AddNetworkCommand.create(core));
    subCommands.push(await ListNetworkCommand.create(core));

    const command = {
      name: 'Manage Network',
      cmd: 'network',
      summary: 'Manage networks',
      description: 'Add and list networks',
      subCommands,
    };
    return new NetworkCommand(command, core);
  }

  private constructor(command: ICommand, core: FlexdOpsCore) {
    super(command);
    this.core = core;
  }
}
