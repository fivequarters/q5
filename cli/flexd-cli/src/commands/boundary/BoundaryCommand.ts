import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { BoundaryListCommand } from './BoundaryListCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Boundaries',
  cmd: 'boundary',
  summary: 'Manage boundaries',
  description: [
    'List boundaries and stream real-time boundary logs.',
    `${EOL}${EOL}A boundary is an isolation mechanism. Two functions in`,
    'two different boundaries are guaranteed to be isolated from each other.',
    'Two functions in the same boundary are not guaranteed to be isolated from each other.',
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
      description: 'The subscription id to use when executing the command.',
      defaultText: 'profile value',
    },
  ],
  modes: ['account', 'subscription', 'boundary'],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await BoundaryListCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class BoundaryCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new BoundaryCommand(command);
  }
}
