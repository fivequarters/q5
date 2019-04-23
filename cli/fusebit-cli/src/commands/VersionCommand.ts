import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, VersionService } from '../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Version',
  cmd: 'version',
  summary: 'Returns the version of the Fusebit CLI',
  description: 'Returns the current version of the Fusebit CLI.',
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
    await input.io.writeLine();

    const excuteService = await ExecuteService.create(input);
    const versionService = await VersionService.create(input);

    const version = await versionService.getVersion();
    await excuteService.info('Version', version);

    return 0;
  }
}
