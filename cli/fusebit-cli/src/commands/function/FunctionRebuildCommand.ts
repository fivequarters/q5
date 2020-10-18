import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Rebuild a Function',
  cmd: 'rebuild',
  summary: 'Rebuild a function',
  description: [
    'Forces a function to re-evaluate its dependencies, following',
    'semver rules in the package.json to perform upgrades to the latest',
    'acceptable version.',
  ].join(' '),
  arguments: [
    {
      name: 'function',
      description: 'The id of the function',
      required: false,
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class FunctionRebuildCommand extends Command {
  public static async create() {
    return new FunctionRebuildCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;

    const functionService = await FunctionService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    await functionService.patchFunction(functionId, 'rebuild', true);

    return 0;
  }
}
