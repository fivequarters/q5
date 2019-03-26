import { Command, ICommand } from '@5qtrs/cli';
import { FlexdOpsCore } from '@5qtrs/flexd-ops-core';
import { DeployImageCommand } from './DeployImageCommand';
import { PublishImageCommand } from './PublishImageCommand';
import { ListImageCommand } from './ListImageCommand';

// ----------------
// Exported Classes
// ----------------

export class ImageCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    const subCommands = [];
    subCommands.push(await PublishImageCommand.create(core));
    subCommands.push(await ListImageCommand.create(core));
    subCommands.push(await DeployImageCommand.create(core));

    const command = {
      name: 'Manage Image',
      cmd: 'image',
      summary: 'Manage image',
      description: 'Publish, list and remove api image on the Flexd platform',
      subCommands,
    };
    return new ImageCommand(command, core);
  }

  private constructor(command: ICommand, core: FlexdOpsCore) {
    super(command);
    this.core = core;
  }
}
