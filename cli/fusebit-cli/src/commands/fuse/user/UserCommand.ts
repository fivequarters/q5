import { Command, ICommand } from '@5qtrs/cli';
import { UserIdentityCommand } from './identity/UserIdentityCommand';
import { UserAccessCommand } from './access/UserAccessCommand';
import { UserListCommand } from './UserListCommand';
import { UserAddCommand } from './UserAddCommand';
import { UserRemoveCommand } from './UserRemoveCommand';
import { UserUpdateCommand } from './UserUpdateCommand';
import { UserGetCommand } from './UserGetCommand';
import { UserInitCommand } from './UserInitCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'User',
  cmd: 'user',
  summary: 'Manage users',
  description: 'Retrieves and manages users and their identities and access.',
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
  subCommands.push(await UserListCommand.create());
  subCommands.push(await UserGetCommand.create());
  subCommands.push(await UserAddCommand.create());
  subCommands.push(await UserUpdateCommand.create());
  subCommands.push(await UserRemoveCommand.create());
  subCommands.push(await UserIdentityCommand.create());
  subCommands.push(await UserAccessCommand.create());
  subCommands.push(await UserInitCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class UserCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new UserCommand(command);
  }
}
