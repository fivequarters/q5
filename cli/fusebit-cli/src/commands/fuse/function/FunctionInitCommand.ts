import { join } from 'path';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Initialize Function',
  cmd: 'init',
  summary: 'Scaffold a new function in the given directory',
  description: Text.create(
    'Scaffolds a new function in the given directory. ',
    'If the directory is not specified, working directory is used.',
    Text.eol(),
    Text.eol(),
    "The function can be later deployed using '",
    Text.bold('function deploy'),
    "' command."
  ),
  arguments: [
    {
      name: 'target',
      description: [
        'A path to the directory where the function files will be placed.',
        `If not specified, the current working directory is used.`,
      ].join(' '),
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
  ignoreOptions: ['profile', 'boundary', 'subscription'],
};

// ----------------
// Exported Classes
// ----------------

export class FunctionInitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const target = input.arguments[0] as string;
    const executeService = await ExecuteService.create(input);
    const functionService = await FunctionService.create(input);

    await executeService.newLine();

    const targetPath = target ? join(process.cwd(), target) : process.cwd();

    await functionService.confirmInitFunction(targetPath);
    await functionService.initFunction(targetPath);

    return 0;
  }
}
