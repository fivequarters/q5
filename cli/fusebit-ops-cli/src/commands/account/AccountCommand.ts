import { Command, ICommand } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { AddAccountCommand } from './AddAccountCommand';
import { ListAccountCommand } from './ListAccountCommand';

// ----------------
// Exported Classes
// ----------------

export class AccountCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    const subCommands = [];
    subCommands.push(await AddAccountCommand.create(core));
    subCommands.push(await ListAccountCommand.create(core));

    const command = {
      name: 'Manage Account',
      cmd: 'account',
      summary: 'Manage accounts',
      description: 'Add and list accounts',
      subCommands,
    };
    return new AccountCommand(command, core);
  }

  private constructor(command: ICommand, core: FusebitOpsCore) {
    super(command);
    this.core = core;
  }
}
