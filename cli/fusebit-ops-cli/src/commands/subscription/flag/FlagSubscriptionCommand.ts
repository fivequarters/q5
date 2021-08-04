import { Command, ICommand } from '@5qtrs/cli';
import { SetSubscriptionFlagsCommand } from './SetSubscriptionFlagsCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: "Subscription's Flag",
  cmd: 'flag',
  summary: 'Manage flags of a subscription',
  description: 'Manages the flags of Fusebit subscriptions',
};

// ----------------
// Exported Classes
// ----------------

export class FlagSubscriptionCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await SetSubscriptionFlagsCommand.create());
    command.subCommands = subCommands;
    return new FlagSubscriptionCommand(command);
  }

  private constructor(cmd: ICommand) {
    super(cmd);
  }
}
