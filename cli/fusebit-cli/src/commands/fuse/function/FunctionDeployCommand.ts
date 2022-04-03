import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, FunctionService } from '../../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Deploy Function',
  cmd: 'deploy',
  summary: 'Deploy a function',
  description: Text.create(
    'Builds and deploys a function using files in the given directory.',
    Text.eol(),
    Text.eol(),
    'At a minimum, there must be an index.js file within the directory. Additionally, further application ',
    'settings can be specified in a .env file. Any npm module dependencies can be specified in a regular ',
    'package.json file. These files must be located directly in the given directory; subdirectories are ',
    'not considered.'
  ),
  arguments: [
    {
      name: 'function',
      description: 'The id of the function to deploy',
      required: false,
    },
  ],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A path to the directory with the function source code to deploy',
      defaultText: 'current directory',
    },
    {
      name: 'ignore',
      aliases: ['i'],
      description: 'A file or directory to ignore; you can specify this option multiple times',
      type: ArgType.string,
      allowMany: true,
    },
    {
      name: 'cron',
      aliases: ['c'],
      description: Text.create(
        'The cron schedule to use to invoke the function, or "off" to turn cron off.',
        "Construct a CRON string at https://crontab.guru/. For example: '",
        Text.bold('--cron "0 */1 * * *"'),
        "' runs every hour and '",
        Text.bold('--cron "*/15 * * * *"'),
        ' runs every 15 minutes.'
      ),
    },
    {
      name: 'timezone',
      aliases: ['t'],
      description: [
        'The timezone to use when invoking the function with the cron schedule.',
        'Check valid timezones at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones',
      ].join(' '),
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
      description: "The format to display the output: 'pretty', 'json', 'raw'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class FunctionDeployCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new FunctionDeployCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;
    const sourceDir = input.options.dir as string;
    const cron = input.options.cron as string;
    const timezone = input.options.timezone as string;

    const functionService = await FunctionService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const sourcePath = sourceDir ? join(process.cwd(), sourceDir) : process.cwd();
    const functionSpec = await functionService.getFunctionSpec(sourcePath, cron, timezone);

    await functionService.confirmDeploy(sourcePath, functionSpec, functionId, cron);

    const location = await functionService.deployFunction(sourcePath, functionId, functionSpec);

    await functionService.setFusebitJson(sourcePath, functionSpec);
    await functionService.displayFunctionUrl(location);

    return 0;
  }
}
