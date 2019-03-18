import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { ProfileListCommand } from './ProfileListCommand';
import { ProfileDefaultCommand } from './ProfileDefaultCommand';
import { ProfileCopyCommand } from './ProfileCopyCommand';
import { ProfileRemoveCommand } from './ProfileRemoveCommand';
import { ProfileSetCommand } from './ProfileSetCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Profiles',
  cmd: 'profile',
  summary: 'Manage profiles',
  description: [
    'Manage locally stored profiles.',
    `${EOL}${EOL}A profile encapsulates stored credentials and common`,
    'command options so that they do not need to be individually',
    `specified each time a command is executed.${EOL}${EOL}If no profile`,
    'is specified when a command is executed, the default profile credentials',
    'and command options are used.',
  ].join(' '),
  modes: ['account', 'subscription', 'boundary', 'function'],
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ProfileListCommand.create());
  subCommands.push(await ProfileDefaultCommand.create());
  subCommands.push(await ProfileCopyCommand.create());
  subCommands.push(await ProfileSetCommand.create());
  subCommands.push(await ProfileRemoveCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class ProfileCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new ProfileCommand(command);
  }
}
