import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { ClientIdentityAddCommand } from './ClientIdentityAddCommand';
import { ClientIdentityRemoveCommand } from './ClientIdentityRemoveCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Client Identity',
  cmd: 'identity',
  summary: 'Manage client identities',
  description: [
    `Add or remove identities associated with a client.${EOL}${EOL}A`,
    "client identity is a set of 'iss' (issuer) and 'sub' (subject) claims in an access",
    `token that identify the client.${EOL}${EOL}A profile must have 'manage' access to`,
    'an account in order to add or remove the identities of clients.',
  ].join(' '),
  modes: ['account'],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ClientIdentityAddCommand.create());
  subCommands.push(await ClientIdentityRemoveCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class ClientIdentityCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new ClientIdentityCommand(command);
  }
}
