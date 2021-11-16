import { Command, ICommand } from '@5qtrs/cli';

import { FeedListCommand } from './FeedListCommand';
import { IFeedOptions } from './FeedOptions';

// ------------------
// Internal Constants
// ------------------

// ------------------
// Internal Functions
// ------------------

async function getSubCommands(feedOptions: IFeedOptions) {
  const subCommands = [];
  subCommands.push(await FeedListCommand.create(feedOptions));
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class FeedCommand extends Command {
  private constructor(cmd: ICommand) {
    super(cmd);
  }

  public static async create(feedOptions: IFeedOptions) {
    const command: ICommand = {
      name: 'Feed',
      cmd: 'feed',
      summary: `Manage the ${feedOptions.capitalSingular} example feed`,
      description: `Commands that use the public ${feedOptions.singular} feed`,
      options: [],
    };

    command.subCommands = await getSubCommands(feedOptions);
    return new FeedCommand(command);
  }
}
