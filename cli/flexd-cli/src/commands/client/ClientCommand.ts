import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { ClientIdentityCommand } from './identity/ClientIdentityCommand';
import { ClientAccessCommand } from './access/ClientAccessCommand';
import { ClientListCommand } from './ClientListCommand';
import { ClientAddCommand } from './ClientAddCommand';
import { ClientRemoveCommand } from './ClientRemoveCommand';
import { ClientUpdateCommand } from './ClientUpdateCommand';
import { ClientGetCommand } from './ClientGetCommand';
import { ClientCliCommand } from './ClientCliCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Client',
  cmd: 'client',
  summary: 'Manage clients',
  description: [
    `Retrieves and manages clients and their identities and access.${EOL}${EOL}The ability`,
    'to retrieve and manage a client depends on the access of the profile used. A profile',
    "must have 'manage' access to an account in order to retrieve or manage a client",
  ].join(' '),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command.',
      defaultText: 'default profile',
    },
    {
      name: 'account',
      aliases: ['a'],
      description: 'The account id to use when executing the command.',
      defaultText: 'profile value',
    },
  ],
  modes: ['account'],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ClientListCommand.create());
  subCommands.push(await ClientGetCommand.create());
  subCommands.push(await ClientAddCommand.create());
  subCommands.push(await ClientUpdateCommand.create());
  subCommands.push(await ClientRemoveCommand.create());
  subCommands.push(await ClientIdentityCommand.create());
  subCommands.push(await ClientAccessCommand.create());
  subCommands.push(await ClientCliCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class ClientCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new ClientCommand(command);
  }
}
