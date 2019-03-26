import { Command, ICommand } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/flexd-ops-core';
import { AddAccountCommand } from './AddAccountCommand';
import { ListAccountCommand } from './ListAccountCommand';

// ----------------
// Exported Classes
// ----------------

export class AccountCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
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

  private constructor(command: ICommand, core: FlexdOpsCore) {
    super(command);
    this.core = core;
  }
}
