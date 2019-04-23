import { Command, ICommand } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { AddDomainCommand } from './AddDomainCommand';
import { GetDomainCommand } from './GetDomainCommand';
import { ListDomainCommand } from './ListDomainCommand';

// ----------------
// Exported Classes
// ----------------

export class DomainCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    const subCommands = [];
    subCommands.push(await AddDomainCommand.create(core));
    subCommands.push(await GetDomainCommand.create(core));
    subCommands.push(await ListDomainCommand.create(core));

    const command = {
      name: 'Manage Domain',
      cmd: 'domain',
      summary: 'Manage domains',
      description: 'Add and list domains',
      subCommands,
    };
    return new DomainCommand(command, core);
  }

  private constructor(command: ICommand, core: FusebitOpsCore) {
    super(command);
    this.core = core;
  }
}
