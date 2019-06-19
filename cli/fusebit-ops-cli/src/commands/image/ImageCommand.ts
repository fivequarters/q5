import { Command, ICommand } from '@5qtrs/cli';
import { PublishImageCommand } from './PublishImageCommand';
import { ListImageCommand } from './ListImageCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Manage Image',
  cmd: 'image',
  summary: 'Manage image',
  description: 'Publish, list and remove available images of the Fusebit platform',
};

// ----------------
// Exported Classes
// ----------------

export class ImageCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await PublishImageCommand.create());
    subCommands.push(await ListImageCommand.create());
    command.subCommands = subCommands;
    return new ImageCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
