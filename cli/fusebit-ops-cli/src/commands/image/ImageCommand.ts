import { Command, ICommand } from '@5qtrs/cli';
import { PublishImageCommand } from './PublishImageCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Manage Image',
  cmd: 'image',
  summary: 'Manage image',
  description: 'Publish, list and remove api image on the Fusebit platform',
};

// ----------------
// Exported Classes
// ----------------

export class ImageCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await PublishImageCommand.create());
    command.subCommands = subCommands;
    return new ImageCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
