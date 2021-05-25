import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { FunctionListCommand } from './FunctionListCommand';
import { FunctionLogCommand } from './FunctionLogCommand';
import { FunctionGetCommand } from './FunctionGetCommand';
import { FunctionRemoveCommand } from './FunctionRemoveCommand';
import { FunctionDeployCommand } from './FunctionDeployCommand';
import { FunctionEditCommand } from './FunctionEditCommand';
import { FunctionServeCommand } from './FunctionServeCommand';
import { FunctionInitCommand } from './FunctionInitCommand';
import { FunctionUrlCommand } from './FunctionUrlCommand';
import { FunctionRebuildCommand } from './FunctionRebuildCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Functions',
  cmd: 'function',
  summary: 'Manage functions',
  description: [
    'Manage and deploy functions, as well as stream real-time function logs.',
    `${EOL}${EOL}A function is a unit of execution that can be deployed`,
    'and invoked via an HTTP request to a particular URL.',
  ].join(' '),
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'The boundary id to use when executing the command',
      defaultText: 'profile value',
    },
    {
      name: 'subscription',
      description: 'The subscription id to use when executing the command',
      defaultText: 'profile value',
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await FunctionInitCommand.create());
  subCommands.push(await FunctionListCommand.create());
  subCommands.push(await FunctionEditCommand.create());
  subCommands.push(await FunctionGetCommand.create());
  subCommands.push(await FunctionUrlCommand.create());
  subCommands.push(await FunctionDeployCommand.create());
  subCommands.push(await FunctionServeCommand.create());
  subCommands.push(await FunctionRebuildCommand.create());
  subCommands.push(await FunctionRemoveCommand.create());
  subCommands.push(await FunctionLogCommand.create());
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
