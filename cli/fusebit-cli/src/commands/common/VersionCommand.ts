import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, VersionService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  skipBuiltInProfile: true,
  name: 'Version',
  cmd: 'version',
  summary: `Returns the version of the ${COMMAND_MODE} CLI`,
  description: `Returns the current version of the ${COMMAND_MODE} CLI.`,
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json', 'raw'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class VersionCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new VersionCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const excuteService = await ExecuteService.create(input);

    await excuteService.newLine();

    const version = VersionService.getVersion();

    const output = input.options.output;
    if (output === 'json') {
      await input.io.writeLineRaw(JSON.stringify({ version }, null, 2));
    } else if (output === 'raw') {
      await input.io.writeLineRaw(version.toString());
    } else {
      await excuteService.info('Version', version);
    }

    return 0;
  }
}
