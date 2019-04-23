import { Command, ICommand } from '@5qtrs/cli';
import { FusebitOpsCore } from '@5qtrs/fusebit-ops-core';
import { DeployImageCommand } from './DeployImageCommand';
import { PublishImageCommand } from './PublishImageCommand';
import { ListImageCommand } from './ListImageCommand';

// ----------------
// Exported Classes
// ----------------

export class ImageCommand extends Command {
  private core: FusebitOpsCore;

  public static async create(core: FusebitOpsCore) {
    const subCommands = [];
    subCommands.push(await PublishImageCommand.create(core));
    subCommands.push(await ListImageCommand.create(core));
    subCommands.push(await DeployImageCommand.create(core));

    const command = {
      name: 'Manage Image',
      cmd: 'image',
      summary: 'Manage image',
      description: 'Publish, list and remove api image on the Fusebit platform',
      subCommands,
    };
    return new ImageCommand(command, core);
  }

  private constructor(command: ICommand, core: FusebitOpsCore) {
    super(command);
    this.core = core;
  }
}
