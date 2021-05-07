import { Command, ICommand } from '@5qtrs/cli';
import { StartRestoreCommand } from './StartRestoreCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Restore Fusebit Infrastructure',
  cmd: 'restore',
  summary: 'Restore Fusebit Infrastructure',
  description: 'Restore Fusebit Infrastructure From Backup Points',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use',
      defaultText: 'default profile',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class RestoreCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await StartRestoreCommand.create());
    command.subCommands = subCommands;
    return new RestoreCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
