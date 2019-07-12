import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../services';

const command = {
  name: 'Edit Function',
  cmd: 'edit',
  summary: 'Edit a function in the Fusebit editor',
  description: [
    'Opens the Fusebit Editor in your default browser to edit a function.',
    'If the function does not exist, it is created.',
  ].join(' '),
  arguments: [
    {
      name: 'function',
      description: 'The id of the function to edit',
      required: false,
    },
  ],
  options: [
    {
      name: 'theme',
      aliases: ['t'],
      description: "The theme of the editor: 'light' or 'dark'",
      default: 'light',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

export class FunctionEditCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionEditCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;
    const theme = input.options.theme as string;

    const executeService = await ExecuteService.create(input);
    const functionService = await FunctionService.create(input);

    await executeService.newLine();

    await functionService.startEditServer(functionId, theme);

    return 0;
  }
}
