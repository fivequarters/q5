import { Command, ICommand } from '@5qtrs/cli';

import { StorageGetCommand } from './StorageGetCommand';
import { StoragePutCommand } from './StoragePutCommand';
import { StorageListCommand } from './StorageListCommand';
import { StorageRemoveCommand } from './StorageRemoveCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Storage',
  cmd: 'storage',
  summary: 'Manage storage',
  description: 'Manage and deploy storage entries.',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await StorageGetCommand.create());
  subCommands.push(await StoragePutCommand.create());
  subCommands.push(await StorageListCommand.create());
  subCommands.push(await StorageRemoveCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class StorageCommand extends Command {
  private constructor(cmd: ICommand) {
    super(cmd);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new StorageCommand(command);
  }
}
