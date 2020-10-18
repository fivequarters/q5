import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Enable a Function',
  cmd: 'enable',
  summary: 'Enable a function to accept calls',
  description: 'Restores the ability of a function previously disabled to be executed through its url.',
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

export class FunctionEnableCommand extends Command {
  public static async create() {
    return new FunctionEnableCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;

    const functionService = await FunctionService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    await functionService.patchFunction(functionId, 'enable', true);

    return 0;
  }
}
