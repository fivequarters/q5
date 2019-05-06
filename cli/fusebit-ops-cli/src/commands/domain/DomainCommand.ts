import { Command, ICommand } from '@5qtrs/cli';
import { AddDomainCommand } from './AddDomainCommand';
import { GetDomainCommand } from './GetDomainCommand';
import { ListDomainCommand } from './ListDomainCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Manage Domain',
  cmd: 'domain',
  summary: 'Manage domains',
  description: 'Add and list domains',
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

export class DomainCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddDomainCommand.create());
    subCommands.push(await GetDomainCommand.create());
    subCommands.push(await ListDomainCommand.create());
    command.subCommands = subCommands;
    return new DomainCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
