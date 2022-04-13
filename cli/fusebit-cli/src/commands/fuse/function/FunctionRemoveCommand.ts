import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { FunctionService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Function',
  cmd: 'rm',
  summary: 'Remove a deployed function',
  description: 'Permanently removes a deployed function.',
  arguments: [
    {
      name: 'function',
      description: 'The function id of the function to remove',
      required: false,
    },
  ],
  options: [
    {
      name: 'quiet',
      aliases: ['q'],
      description: 'If set to true, does not prompt for confirmation',
      type: ArgType.boolean,
      default: 'false',
    },
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

export class FunctionRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;

    const executeService = await ExecuteService.create(input);
    const functionService = await FunctionService.create(input);

    await executeService.newLine();

    const functionSpec = await functionService.getFunction(process.cwd(), functionId);

    await functionService.confirmRemove(functionSpec);

    await functionService.removeFunction(functionId);

    return 0;
  }
}
