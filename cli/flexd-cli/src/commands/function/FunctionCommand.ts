import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { FunctionListCommand } from './FunctionListCommand';
import { FunctionLogCommand } from './FunctionLogCommand';
import { FunctionGetCommand } from './FunctionGetCommand';
import { FunctionRemoveCommand } from './FunctionRemoveCommand';
import { FunctionDeployCommand } from './FunctionDeployCommand';

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
      description: 'The name of the profile to use when executing the command.',
      defaultText: 'default profile',
    },
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'The sunscription id to use when executing the command.',
      defaultText: 'profile value',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'The boundary id to to use when executing the command.',
      defaultText: 'profile value',
    },
  ],
  modes: ['account', 'subscription', 'boundary', 'function'],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await FunctionListCommand.create());
  subCommands.push(await FunctionGetCommand.create());
  subCommands.push(await FunctionDeployCommand.create());
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
