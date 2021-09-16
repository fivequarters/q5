import { Command, ICommand } from '@5qtrs/cli';
import { RegistrySetMasterCommand } from './RegistrySetMasterCommand';
import { RegistryClearModulesCommand } from './RegistryClearModulesCommand';

// ------------------
// Internal Constants
// ------------------

const commands: ICommand = {
  name: 'Registry',
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
    subCommands.push(await RegistryClearModulesCommand.create());
    commands.subCommands = subCommands;
    return new RegistryCommand(commands);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
