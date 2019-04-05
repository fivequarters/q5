import { Command, IExecuteInput } from '@5qtrs/cli';
import { join } from 'path';
import { readFile } from '@5qtrs/file';
import { ExecuteService } from '../services/ExecuteService';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Version',
  cmd: 'version',
  summary: 'Returns the version of the flx CLI',
  description: 'Returns the current version of the flx CLI.',
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

    let version;
    try {
      const path = join(__dirname, '..', '..', 'package.json');
      const buffer = await readFile(path);
      const content = buffer.toString();
      const json = JSON.parse(content);
      version = json.version;
    } catch (error) {
      excuteService.error('Version Error', 'Unable to read the version of the current Flexd CLI installation');
      throw error;
    }

    if (version) {
      await excuteService.info('Version', version);
    }

    return 0;
  }
}
