import { Command, IExecuteInput } from '@5qtrs/cli';
import { FunctionService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Function Location',
  cmd: 'url',
  summary: 'Get the execution URL of a deployed function',
  description: 'Retrieves the execution URL of a deployed function.',
  arguments: [
    {
      name: 'function',
      description: 'The id of the function',
      required: false,
    },
  ],
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json', 'raw'",
      default: 'raw',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class FunctionUrlCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionUrlCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;

    const functionService = await FunctionService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const location = await functionService.getFunctionUrl(functionId);
    await functionService.displayFunctionUrl(location);

    return 0;
  }
}
