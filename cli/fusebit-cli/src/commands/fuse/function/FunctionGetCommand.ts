import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';
import { filterSeries } from 'async';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Function',
  cmd: 'get',
  summary: 'Get a deployed function',
  description: Text.create(
    "Retrieves details of a deployed function. When the '",
    Text.bold('--dir'),
    "' option is given, the function code is downloaded and save to disk in the given directory."
  ),
  arguments: [
    {
      name: 'function',
      description: 'The id of the function to get',
      required: false,
    },
  ],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'The directory in which to save the function code',
    },
    {
      name: 'show-settings',
      aliases: ['s'],
      description: 'If set to true, display application settings values',
      type: ArgType.boolean,
      default: 'false',
    },
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

export class FunctionGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;
    const target = input.options.dir as string;
    const showSettings = input.options['show-settings'] as boolean;

    const executeService = await ExecuteService.create(input);
    const functionService = await FunctionService.create(input);

    const download = target !== undefined;
    const targetPath = target ? join(process.cwd(), target) : process.cwd();

    await executeService.newLine();

    const functionSpec = await functionService.getFunction(targetPath, functionId);

    if (download) {
      await functionService.confirmSaveFunction(targetPath, functionSpec, functionId);
      const files = await functionService.setFunctionFiles(targetPath, functionSpec);
      await functionService.setFusebitJson(targetPath, functionSpec);
      files.push('fusebit.json');
      await functionService.displayFunctionSave(targetPath, files, functionId);
    } else {
      await functionService.displayFunction(functionSpec, showSettings);
    }

    return 0;
  }
}
