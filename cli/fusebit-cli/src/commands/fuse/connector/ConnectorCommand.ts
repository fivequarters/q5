import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';

import { ConnectorInitCommand } from './ConnectorInitCommand';
import { ConnectorDeployCommand } from './ConnectorDeployCommand';
import { ConnectorGetCommand } from './ConnectorGetCommand';
import { ConnectorListCommand } from './ConnectorListCommand';
import { ConnectorLogCommand } from './ConnectorLogCommand';
import { ConnectorRemoveCommand } from './ConnectorRemoveCommand';
import { IdentityCommand } from './identity/IdentityCommand';
import { FeedCommand, IFeedOptions, FeedTypes } from '../feed';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Connectors',
  cmd: 'connector',
  summary: 'Manage connectors',
  description: [
    'Manage and deploy connectors.',
    `${EOL}${EOL}A connector manages authentication with a third-party system.`,
  ].join(' '),
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
  singular: 'connector',
  capitalSingular: 'Connector',
  plural: 'connectors',
  capitalPlural: 'Connectors',
  feedKey: FeedTypes.connector,
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ConnectorInitCommand.create());
  subCommands.push(await ConnectorDeployCommand.create());
  subCommands.push(await FeedCommand.create(feedOptions));
  subCommands.push(await ConnectorGetCommand.create());
  subCommands.push(await ConnectorListCommand.create());
  subCommands.push(await ConnectorLogCommand.create());
  subCommands.push(await ConnectorRemoveCommand.create());
  subCommands.push(await IdentityCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class ConnectorCommand extends Command {
  private constructor(cmd: ICommand) {
    super(cmd);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new ConnectorCommand(command);
  }
}
