import { Command, ICommand } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/fusebit-ops-core';
import { AddDomainCommand } from './AddDomainCommand';
import { GetDomainCommand } from './GetDomainCommand';
import { ListDomainCommand } from './ListDomainCommand';

// ----------------
// Exported Classes
// ----------------

export class DomainCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
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

  private constructor(command: ICommand, core: FlexdOpsCore) {
    super(command);
    this.core = core;
  }
}
