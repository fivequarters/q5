import { Command, ICommand } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
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
  subCommands.push(await ProfileImportCommand.create());
  subCommands.push(await ProfileExportCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class ProfileCommand extends Command {
  private constructor(cmd: ICommand) {
    super(cmd);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new ProfileCommand(command);
  }
}
