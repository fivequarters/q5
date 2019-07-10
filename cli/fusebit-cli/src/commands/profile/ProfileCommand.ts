import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { ProfileListCommand } from './ProfileListCommand';
import { ProfileSetCommand } from './ProfileSetCommand';
import { ProfileGetCommand } from './ProfileGetCommand';
import { ProfileAddCommand } from './ProfileAddCommand';
import { ProfileCopyCommand } from './ProfileCopyCommand';
import { ProfileRenameCommand } from './ProfileRenameCommand';
import { ProfileRemoveCommand } from './ProfileRemoveCommand';
import { ProfileUpdateCommand } from './ProfileUpdateCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'Profiles',
  cmd: 'profile',
  summary: 'Manage profiles',
  description: [
    'Manage stored profiles.',
    `${EOL}${EOL}A profile encapsulates stored credentials and common`,
    'command options so that they do not need to be individually',
    `specified each time a command is executed.${EOL}${EOL}If no profile`,
    'is specified when a command is executed, the default profile credentials',
    'and command options are used.',
  ].join(' '),
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ProfileListCommand.create());
  subCommands.push(await ProfileGetCommand.create());
  subCommands.push(await ProfileSetCommand.create());
  subCommands.push(await ProfileAddCommand.create());
  subCommands.push(await ProfileCopyCommand.create());
  subCommands.push(await ProfileRenameCommand.create());
  subCommands.push(await ProfileUpdateCommand.create());
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
