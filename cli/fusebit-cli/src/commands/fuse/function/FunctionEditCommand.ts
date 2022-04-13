import { Command, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

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
      aliases: ['m'],
      description: "The theme of the editor: 'light' or 'dark'",
      default: 'light',
    },
    {
      name: 'template',
      aliases: ['t'],
      description: 'Location of the function template on Github in the {org}/{repo}[/{directory}] format',
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
    const template = input.options.template as string;

    const executeService = await ExecuteService.create(input);
    const functionService = await FunctionService.create(input);

    await executeService.newLine();

    const functionResponse = await functionService.tryGetFunction(functionId);

    if (template) {
      const functionSpec = await functionService.getFunctionSpecFromGithubTemplate(template);
      if (functionResponse.status === 200) {
        await functionService.confirmOverrideWithTemplate();
        await functionService.deployFunction(undefined, functionId, functionSpec);
      }
      await functionService.startEditServer(functionId, theme, functionSpec);
    } else {
      await functionService.startEditServer(
        functionId,
        theme,
        functionResponse.status === 200 && functionResponse.data
      );
    }

    return 0;
  }
}
