import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { IssuerListCommand } from './IssuerListCommand';
import { IssuerGetCommand } from './IssuerGetCommand';
import { IssuerAddCommand } from './IssuerAddCommand';
import { IssuerUpdateCommand } from './IssuerUpdateCommand';
import { IssuerRemoveCommand } from './IssuerRemoveCommand';
import { IssuerKeyCommand } from './key/IssuerKeyCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Issuer',
  cmd: 'issuer',
  summary: 'Manage issuers',
  description: [
    `Retrieves and manages issuers associated with a given account.${EOL}${EOL}The ability`,
    'to retrieve and manage issuers depends on the access of the profile used. A profile',
    "must have 'manage' access to an account in order to retrieve or manage issuers",
    'associated with that account.',
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
  subCommands.push(await IssuerListCommand.create());
  subCommands.push(await IssuerGetCommand.create());
  subCommands.push(await IssuerAddCommand.create());
  subCommands.push(await IssuerUpdateCommand.create());
  subCommands.push(await IssuerRemoveCommand.create());
  subCommands.push(await IssuerKeyCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class IssuerCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new IssuerCommand(command);
  }
}
