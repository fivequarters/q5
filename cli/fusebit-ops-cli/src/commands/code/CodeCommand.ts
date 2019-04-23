import { Command, ICommand } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { PublishCodeCommand } from './PublishCodeCommand';
import { ListCodeCommand } from './ListCodeCommand';

// ----------------
// Exported Classes
// ----------------

export class CodeCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    const subCommands = [];
    subCommands.push(await PublishCodeCommand.create(core));
    subCommands.push(await ListCodeCommand.create(core));

    const command = {
      name: 'Manage Code',
      cmd: 'code',
      summary: 'Manage code',
      description: 'Publish, list and remove api code on the Fusebit platform',
      subCommands,
    };
    return new CodeCommand(command, core);
  }

  private constructor(command: ICommand, core: FusebitOpsCore) {
    super(command);
    this.core = core;
  }
}
