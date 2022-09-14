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
  description: 'Add and remove public keys of a trusted issuer.',
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
