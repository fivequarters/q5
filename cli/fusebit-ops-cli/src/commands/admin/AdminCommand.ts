import { Command, ICommand } from '@5qtrs/cli';
import { InitAdminCommand } from './InitAdminCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Admin',
  cmd: 'admin',
  summary: 'Manage Fusebit administrators',
  description: 'Manage Fusebit administrators',
};

// ----------------
// Exported Classes
// ----------------

export class AdminCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await InitAdminCommand.create());
    command.subCommands = subCommands;
    return new AdminCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
