import { Command, ICommand } from '@5qtrs/cli';
import { AddSubscriptionCommand } from './AddSubscriptionCommand';
import { ListSubscriptionCommand } from './ListSubscriptionCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Subscription',
  cmd: 'subscription',
  summary: 'Manage subscriptions',
  description: 'Add or list Fusebit accounts and subscriptions',
};

// ----------------
// Exported Classes
// ----------------

export class SubscriptionCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await AddSubscriptionCommand.create());
    subCommands.push(await ListSubscriptionCommand.create());
    command.subCommands = subCommands;
    return new SubscriptionCommand(command);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
