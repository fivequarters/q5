import { EOL } from 'os';
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
  description: [
    `Add or remove access for a user.${EOL}${EOL}A`,
    'user may have access to an account, subscriptions within an account,',
    'boundaries within a subscription, or a function within a boundary.',
    `${EOL}${EOL}A profile must have 'manage' access to an account or a subscription`,
    'in that account in order to add or remove access for a user.',
  ].join(' '),
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
