import { Command, ICommand } from '@5qtrs/cli';
import { AddAccountCommand } from './AddAccountCommand';
import { ListAccountCommand } from './ListAccountCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Manage Account',
  cmd: 'account',
  summary: 'Manage accounts',
  description: 'Add and list accounts',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use',
      defaultText: 'default profile',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AccountCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddAccountCommand.create());
    subCommands.push(await ListAccountCommand.create());
    command.subCommands = subCommands;
    return new AccountCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
