import { Command, ICommand } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/flexd-ops-core';
import { PublishCodeCommand } from './PublishCodeCommand';
import { ListCodeCommand } from './ListCodeCommand';

// ----------------
// Exported Classes
// ----------------

export class CodeCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    const subCommands = [];
    subCommands.push(await PublishCodeCommand.create(core));
    subCommands.push(await ListCodeCommand.create(core));

    const command = {
      name: 'Manage Code',
      cmd: 'code',
      summary: 'Manage code',
      description: 'Publish, list and remove api code on the Flexd platform',
      subCommands,
    };
    return new CodeCommand(command, core);
  }

  private constructor(command: ICommand, core: FlexdOpsCore) {
    super(command);
    this.core = core;
  }
}
