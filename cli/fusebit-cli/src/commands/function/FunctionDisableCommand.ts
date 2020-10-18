import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Disable a Function',
  cmd: 'disable',
  summary: 'Disable a function',
  description: 'Prevents a function from being executed through its url.',
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

export class FunctionDisableCommand extends Command {
  public static async create() {
    return new FunctionDisableCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;

    const functionService = await FunctionService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    await functionService.patchFunction(functionId, 'enable', false);

    return 0;
  }
}
