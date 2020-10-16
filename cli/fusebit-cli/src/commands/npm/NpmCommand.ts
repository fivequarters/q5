import { Command, ICommand } from '@5qtrs/cli';

import { NpmExecCommand } from './NpmExecCommand';
import { NpmLoginCommand } from './NpmLoginCommand';
import { NpmSearchCommand } from './NpmSearchCommand';
import { RegistryCommand } from './registry/RegistryCommand';

// ------------------
// Internal Constants
// ------------------

const commandDesc: ICommand = {
  name: 'NPM Registry',
  cmd: 'npm',
  summary: 'Manipulate NPM Packages',
  description: [
    'Execute commands with the Fusebit registry for this profile mapped to',
    'the appropriate NPM scopes.',
  ].join(' '),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class NpmCommand extends Command {
  public static async getSubCommands() {
    const subCommands = [];
    subCommands.push(await NpmSearchCommand.create());
    subCommands.push(await NpmLoginCommand.create());
    subCommands.push(await NpmExecCommand.create());
    subCommands.push(await RegistryCommand.create());
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
