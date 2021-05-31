import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';

import { ConnectorDeployCommand } from './ConnectorDeployCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Connectors',
  cmd: 'connector',
  summary: 'Manage connectors',
  description: [
    'Manage and deploy connectors, as well as stream real-time logs.',
    `${EOL}${EOL}A connector manages authentication with a third-party system.`,
  ].join(' '),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommnands.push(await ConnectorDeployCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class FunctionCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new FunctionCommand(command);
  }
}
