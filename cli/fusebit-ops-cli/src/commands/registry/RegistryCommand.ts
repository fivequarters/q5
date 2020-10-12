import { Command, ICommand } from '@5qtrs/cli';
import { RegistrySetMasterCommand } from './RegistrySetMasterCommand';

// ------------------
// Internal Constants
// ------------------

const commands: ICommand = {
  name: 'Registrys',
  cmd: 'registry',
  summary: 'Update registry configuration',
  description: 'Update the configuration of the global registry.',
};

// ----------------
// Exported Classes
// ----------------

export class RegistryCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await RegistrySetMasterCommand.create());
    commands.subCommands = subCommands;
    return new RegistryCommand(commands);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
