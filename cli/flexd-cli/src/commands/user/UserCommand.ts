import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { UserIdentityCommand } from './identity/UserIdentityCommand';
import { UserAccessCommand } from './access/UserAccessCommand';
import { UserListCommand } from './UserListCommand';
import { UserAddCommand } from './UserAddCommand';
import { UserRemoveCommand } from './UserRemoveCommand';
import { UserUpdateCommand } from './UserUpdateCommand';
import { UserGetCommand } from './UserGetCommand';
import { UserCliCommand } from './UserCliCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'User',
  cmd: 'user',
  summary: 'Manage users',
  description: [
    `Retrieves and manages users and their identities and access.${EOL}${EOL}The ability`,
    'to retrieve and manage a user depends on the access of the profile used. A profile',
    "must have 'manage' access to an account or a subscription within that account in order",
    'to retrieve or manage a user with access to that given account or any subscriptions,',
    `boundaries or functions within the account.${EOL}${EOL}A profile that only has 'manage'`,
    'access to a boundary or function is not able to retrieve, list or manage any users.',
    `${EOL}${EOL}Furthermore, all indentities and access statements for a user will be filtered`,
    'to only include those identities and access statements of accounts or subscriptions to',
    'which the profile has access.',
  ].join(' '),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command.',
      default: 'default profile',
    },
  ],
  modes: ['account', 'subscription'],
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
  subCommands.push(await UserCliCommand.create());
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
