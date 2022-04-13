import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../../services';
import { Text } from '@5qtrs/text';
import { join } from 'path';
import { readFileSync } from 'fs';

// ------------------
// Internal Constants
// ------------------

const stdinFileName = '-';

const command = {
  name: 'Import profile',
  cmd: 'import',
  summary: 'Import a profile from input',
  description: ['Read from stdin and import the acquired profile, making it available to other commands'].join(' '),
  arguments: [
    {
      name: 'name',
      description: 'The optional name of the profile to use instead of the name in the imported bundle',
      required: false,
      defaultText: 'profile name',
    },
  ],
  options: [
    {
      name: 'file',
      aliases: ['f'],
      description: `File name with JSON input. If not supplied, data will be read from stdin`,
      default: stdinFileName,
      type: ArgType.string,
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ProfileImportCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ProfileImportCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const profileName = input.arguments[0] as string;
    const file = input.options.file as string;
    const profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    await executeService.execute(
      {
        header: 'Reading data',
        message: Text.create('Reading input data from ', Text.bold(file === stdinFileName ? 'STDIN' : file), '...'),
        errorHeader: 'Data Error',
        errorMessage: Text.create('Error reading input data'),
      },
      async () => {
        const readStdin = async () => {
          const chunks = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks).toString('utf8');
        };

        const content = file === stdinFileName ? await readStdin() : readFileSync(join(process.cwd(), file), 'utf8');
        const json = JSON.parse(content);
        if (typeof json !== 'object') {
          throw new Error('The input data must be a JSON object.');
        }
        const profile = await profileService.importProfile(json, profileName || json.profile.name);

        await profileService.displayProfile(profile);
      }
    );

    return 0;
  }
}
