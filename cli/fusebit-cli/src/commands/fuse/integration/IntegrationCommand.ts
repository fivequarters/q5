import { Command, ICommand } from '@5qtrs/cli';

import { IntegrationInitCommand } from './IntegrationInitCommand';
import { IntegrationDeployCommand } from './IntegrationDeployCommand';
import { IntegrationGetCommand } from './IntegrationGetCommand';
import { IntegrationListCommand } from './IntegrationListCommand';
import { IntegrationLogCommand } from './IntegrationLogCommand';
import { IntegrationRemoveCommand } from './IntegrationRemoveCommand';
import { IntegrationEditCommand } from './IntegrationEditCommand';
import { IntegrationTestCommand } from './IntegrationTestCommand';
import { InstallCommand } from './install/InstallCommand';
import { FeedCommand, IFeedOptions, FeedTypes } from '../feed';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Integrations',
  cmd: 'integration',
  summary: 'Manage integrations',
  description: 'Manage and deploy integrations.',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
    {
      name: 'subscription',
      description: 'The subscription id to use when executing the command',
      defaultText: 'profile value',
    },
  ],
};

const feedOptions: IFeedOptions = {
  singular: 'integration',
  capitalSingular: 'Integration',
  plural: 'integrations',
  capitalPlural: 'Integrations',
  feedKey: FeedTypes.integration,
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await IntegrationInitCommand.create());
  subCommands.push(await IntegrationGetCommand.create());
  subCommands.push(await IntegrationTestCommand.create());
  subCommands.push(await IntegrationDeployCommand.create());
  subCommands.push(await FeedCommand.create(feedOptions));
  subCommands.push(await IntegrationEditCommand.create());
  subCommands.push(await IntegrationListCommand.create());
  subCommands.push(await IntegrationLogCommand.create());
  subCommands.push(await IntegrationRemoveCommand.create());
  subCommands.push(await InstallCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class IntegrationCommand extends Command {
  private constructor(cmd: ICommand) {
    super(cmd);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new IntegrationCommand(command);
  }
}
