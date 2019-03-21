import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { IssuerKeyAddCommand } from './IssuerKeyAddCommand';
import { IssuerKeyRemoveCommand } from './IssuerKeyRemoveCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Issuer Key',
  cmd: 'key',
  summary: 'Manage issuer public keys',
  description: [
    `Add and remove public keys used by the given issuer.${EOL}${EOL}A profile`,
    "must have 'manage' access to an account in order to add or remove public keys",
    'used by an issuer.',
  ].join(' '),
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await IssuerKeyAddCommand.create());
  subCommands.push(await IssuerKeyRemoveCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class IssuerKeyCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new IssuerKeyCommand(command);
  }
}
