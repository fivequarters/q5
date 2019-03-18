import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { ClientAccessAddCommand } from './ClientAccessAddCommand';
import { ClientAccessRemoveCommand } from './ClientAccessRemoveCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Client Access',
  cmd: 'access',
  summary: 'Manage client access',
  description: [
    `Add or remove access for a client.${EOL}${EOL}A`,
    'client may have access to an account, subscriptions within an account,',
    'boundaries within a subscription, or a function within a boundary.',
    `${EOL}${EOL}A profile must have 'manage' access to an account`,
    'in order to add or remove access for a client.',
  ].join(' '),
  modes: ['account'],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ClientAccessAddCommand.create());
  subCommands.push(await ClientAccessRemoveCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class ClientAccessCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new ClientAccessCommand(command);
  }
}
