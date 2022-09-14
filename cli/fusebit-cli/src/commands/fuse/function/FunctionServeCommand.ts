import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../../services';

import { join } from 'path';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Serve this Function',
  cmd: 'serve',
  summary: 'Serve the specified function locally',
  description: ['Redirect traffic to a Fusebit function to a function in the specified loocal directory.'].join(' '),
  arguments: [
    {
      name: 'function',
      description: 'The id of the function to serve',
      required: true,
    },
  ],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A path to the directory with the function source code to serve',
      defaultText: 'current directory',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class FunctionServeCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionServeCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;
    const sourceDir = input.options.dir as string;

    const functionService = await FunctionService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const sourcePath = sourceDir ? join(process.cwd(), sourceDir) : process.cwd();

    await functionService.serveFunction(sourcePath, functionId);

    return 0;
  }
}
