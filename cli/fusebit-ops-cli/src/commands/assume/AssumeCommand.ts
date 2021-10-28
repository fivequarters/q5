import { Command, ICommand } from '@5qtrs/cli';
import { AsAssumeCommand } from './AsAssumeCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Assume role',
  cmd: 'assume',
  summary: 'Assume roles in an account',
  description: 'Assume a user with permissions on an account and subscription in a deployment.',
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

export class AssumeCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AsAssumeCommand.create());
    command.subCommands = subCommands;
    return new AssumeCommand(command);
  }

  private constructor(cmd: ICommand) {
    super(cmd);
  }
}
