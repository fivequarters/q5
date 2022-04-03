import { Command, IExecuteInput } from '@5qtrs/cli';

import { FeedService } from '../../../services';
import { IFeedOptions } from './FeedOptions';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Feed Entries',
  cmd: 'ls',
  summary: 'List entries in the feed',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class FeedListCommand extends Command {
  public feedOptions: IFeedOptions;
  private constructor(feedOptions: IFeedOptions) {
    super(command);
    this.feedOptions = feedOptions;
  }

  public static async create(feedOptions: IFeedOptions) {
    return new FeedListCommand(feedOptions);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const feed = await FeedService.create(input);

    await feed.loadFeed(this.feedOptions.feedKey);

    await feed.displayFeed();

    return 0;
  }
}
