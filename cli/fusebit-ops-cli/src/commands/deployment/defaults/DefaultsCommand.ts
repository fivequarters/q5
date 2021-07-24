import { Command, ICommand } from '@5qtrs/cli';
import { GetDefaultsCommand } from './GetDefaultsCommand';
import { SetDefaultsCommand } from './SetDefaultsCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Set and Get Default Values',
  cmd: 'defaults',
  summary: 'Manage subscription defaults',
  description: 'Set and Get the default values applied to all subscriptions in a deployment',
};

// ----------------
// Exported Classes
// ----------------

export class DefaultsCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await GetDefaultsCommand.create());
    subCommands.push(await SetDefaultsCommand.create());
    command.subCommands = subCommands;
    return new DefaultsCommand(command);
  }

  private constructor(cmd: ICommand) {
    super(cmd);
  }
}
