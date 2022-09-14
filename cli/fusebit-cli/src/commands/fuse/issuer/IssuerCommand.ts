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
  description: 'Retrieves and manages trusted issuers associated with an account.',
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
