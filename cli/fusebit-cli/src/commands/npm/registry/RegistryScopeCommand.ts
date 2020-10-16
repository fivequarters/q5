import { Command, ICommand } from '@5qtrs/cli';

import { RegistryScopeGetCommand } from './RegistryScopeGetCommand';
import { RegistryScopeSetCommand } from './RegistryScopeSetCommand';

// ------------------
// Internal Constants
// ------------------

const commandDesc: ICommand = {
  name: 'NPM Package Scope Management',
  cmd: 'scope',
  summary: 'Manage the authoritative scopes for the registry',
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

export class RegistryScopeCommand extends Command {
  public static async getSubCommands() {
    const subCommands = [];
    subCommands.push(await RegistryScopeGetCommand.create());
    subCommands.push(await RegistryScopeSetCommand.create());
    return subCommands;
  }

  public static async create() {
    commandDesc.subCommands = await RegistryScopeCommand.getSubCommands();
    return new RegistryScopeCommand(commandDesc);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
