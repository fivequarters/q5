import { Command, ICommand } from '@5qtrs/cli';

import { RegistryScopeCommand } from './RegistryScopeCommand';

// ------------------
// Internal Constants
// ------------------

const commandDesc: ICommand = {
  name: 'Registry Management',
  cmd: 'registry',
  summary: 'Set registry configuration for an account',
  description: ['Set and get the allowed scopes that the internal registry supports.'].join(' '),
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

export class RegistryCommand extends Command {
  public static async getSubCommands() {
    const subCommands = [];
    subCommands.push(await RegistryScopeCommand.create());
    return subCommands;
  }

  public static async create() {
    commandDesc.subCommands = await RegistryCommand.getSubCommands();
    return new RegistryCommand(commandDesc);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
