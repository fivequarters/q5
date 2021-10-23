import { Command, ICommand, ArgType } from '@5qtrs/cli';
import { LogGetCommand } from './LogGetCommand';
import { LogStatsCommand } from './LogStatsCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Logs',
  cmd: 'log',
  summary: 'Access logs and statistics',
  description: 'Access execution logs and statistics.',
  options: [
    {
      name: 'profile',
      aliases: ['p'],
      description: 'The name of the profile to use when executing the command',
      defaultText: 'default profile',
    },
    {
      name: 'subscription',
      aliases: ['s'],
      description: 'The subscription id to access logs for',
      defaultText: 'profile value',
    },
    {
      name: 'boundary',
      aliases: ['b'],
      description: 'The boundary id to access logs for',
      defaultText: 'profile value',
    },
    {
      name: 'function',
      aliases: ['f'],
      description: 'The function id to access logs for',
    },
    {
      name: 'connector',
      aliases: ['c'],
      description: 'The connector id to access logs for',
    },
    {
      name: 'integration',
      aliases: ['i'],
      description: 'The integration id to access logs for',
    },
    {
      name: 'from',
      aliases: ['r'],
      description:
        'The start time of the logging window. Specify absolute value in ISO format or relative value as +/-{seconds}. For example "2021-10-23T09:42:07.413Z" or "-300".',
      defaultText: '5 minutes ago',
    },
    {
      name: 'to',
      aliases: ['t'],
      description:
        'The end time of the logging window. Specify absolute value in ISO format or relative value as +/-{seconds}. For example "2021-10-23T09:42:07.413Z" or "+100".',
      defaultText: 'now',
    },
    {
      name: 'limit',
      aliases: ['l'],
      description: 'Maximum number of records to return.',
      type: ArgType.integer,
      default: '20',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'raw', 'json'",
      default: 'pretty',
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await LogGetCommand.create());
  subCommands.push(await LogStatsCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class LogCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new LogCommand(command);
  }
}
