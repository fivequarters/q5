import { Command, ICommand } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { ProfileListCommand } from './ProfileListCommand';
import { ProfileSetCommand } from './ProfileSetCommand';
import { ProfileGetCommand } from './ProfileGetCommand';
import { ProfileCopyCommand } from './ProfileCopyCommand';
import { ProfileRenameCommand } from './ProfileRenameCommand';
import { ProfileRemoveCommand } from './ProfileRemoveCommand';
import { ProfileUpdateCommand } from './ProfileUpdateCommand';
import { ProfileImportCommand } from '../../common/profile/ProfileImportCommand';
import { ProfileExportCommand } from '../../common/profile/ProfileExportCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  skipBuiltInProfile: true,
  name: 'Profiles',
  cmd: 'profile',
  summary: 'Manage profiles',
  description: Text.create([
    'Manage stored profiles.',
    Text.eol(),
    Text.eol(),
    'A profile encapsulates stored credentials and common ',
    'command options so that they do not need to be individually ',
    'specified each time a command is executed.',
    Text.eol(),
    Text.eol(),
    'If no profile is specified when a command is executed, ',
    'the default profile credentials and command options are used.',
    '',
  ]),
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await ProfileListCommand.create());
  subCommands.push(await ProfileGetCommand.create());
  subCommands.push(await ProfileSetCommand.create());
  subCommands.push(await ProfileCopyCommand.create());
  subCommands.push(await ProfileRenameCommand.create());
  subCommands.push(await ProfileUpdateCommand.create());
  subCommands.push(await ProfileRemoveCommand.create());
  subCommands.push(await ProfileImportCommand.create());
  subCommands.push(await ProfileExportCommand.create());
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
