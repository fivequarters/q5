import { Command, IExecuteInput } from '@5qtrs/cli';
import { FunctionService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Function Logs',
  cmd: 'log',
  summary: 'Stream real-time logs',
  description: 'Streams real-time logs from a given function or all functions in a given boundary.',
  arguments: [
    {
      name: 'function',
      description: 'The function id to stream real-time logs from',
      required: false,
    },
  ],
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class FunctionLogCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionLogCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;
    const executeService = await ExecuteService.create(input);
    const functionService = await FunctionService.create(input);

    await executeService.newLine();

    if (functionId) {
      await functionService.getFunction(process.cwd(), functionId);
    }

    await functionService.getFunctionLogs(process.cwd(), functionId);

    return 0;
  }
}
