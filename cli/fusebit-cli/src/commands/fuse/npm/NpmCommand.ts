import { Command, ICommand } from '@5qtrs/cli';

import { NpmExecCommand } from './NpmExecCommand';
import { NpmLoginCommand } from './NpmLoginCommand';
import { NpmSearchCommand } from './NpmSearchCommand';
import { RegistryCommand } from './registry/RegistryCommand';

// ------------------
// Internal Constants
// ------------------

const commandDesc: ICommand = {
  name: 'npm registry',
  cmd: 'npm',
  summary: 'Manipulate npm packages',
  description: [
    'Execute commands with the Fusebit registry for this profile mapped to',
    'the appropriate npm scopes.',
  ].join(' '),
  options: [],
};

// ----------------
// Exported Classes
// ----------------

export class NpmCommand extends Command {
  public static async getSubCommands() {
    const subCommands = [];
    subCommands.push(await NpmLoginCommand.create());
    subCommands.push(await RegistryCommand.create());
    subCommands.push(await NpmSearchCommand.create());
    subCommands.push(await NpmExecCommand.create());
    return subCommands;
  }

  public static async create() {
    commandDesc.subCommands = await NpmCommand.getSubCommands();
    return new NpmCommand(commandDesc);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
