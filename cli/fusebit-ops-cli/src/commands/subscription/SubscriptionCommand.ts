import { Command, ICommand } from '@5qtrs/cli';
import { AddSubscriptionCommand } from './AddSubscriptionCommand';
import { LimitSubscriptionCommand } from './LimitSubscriptionCommand';
import { ListSubscriptionCommand } from './ListSubscriptionCommand';
import { FlagSubscriptionCommand } from './flag/FlagSubscriptionCommand';

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
    subCommands.push(await LimitSubscriptionCommand.create());
    subCommands.push(await FlagSubscriptionCommand.create());
    subCommands.push(await ListSubscriptionCommand.create());
    command.subCommands = subCommands;
    return new SubscriptionCommand(command);
  }

  private constructor(cmd: ICommand) {
    super(cmd);
  }
}
