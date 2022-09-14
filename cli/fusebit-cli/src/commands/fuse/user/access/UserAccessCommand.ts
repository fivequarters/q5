import { Command, ICommand } from '@5qtrs/cli';
import { UserAccessAddCommand } from './UserAccessAddCommand';
import { UserAccessRemoveCommand } from './UserAccessRemoveCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'User Access',
  cmd: 'access',
  summary: 'Manage user access',
  description: 'Add or remove access from a user.',
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await UserAccessAddCommand.create());
  subCommands.push(await UserAccessRemoveCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class UserAccessCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new UserAccessCommand(command);
  }
}
