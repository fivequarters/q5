import { join } from 'path';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, IntegrationService } from '../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Initialize Integration',
  cmd: 'init',
  summary: 'Scaffold a new integration in the given directory',
  description: Text.create(
    'Scaffolds a new integration in the given directory. ',
    'If the directory is not specified, working directory is used.',
    Text.eol(),
    Text.eol(),
    "The integration can be later deployed using '",
    Text.bold('integration deploy'),
    "' command."
  ),
  arguments: [],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A path to the directory with the integration source code to deploy.',
      defaultText: 'current directory',
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
  ignoreOptions: ['profile', 'boundary', 'subscription'],
};

// ----------------
// Exported Classes
// ----------------

export class IntegrationInitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IntegrationInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const sourceDir = input.options.dir as string;

    const integrationService = await IntegrationService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const sourcePath = sourceDir ? join(process.cwd(), sourceDir) : process.cwd();
    const integration = await integrationService.createNewSpec();
    await integrationService.writeDirectory(sourcePath, integration);

    await integrationService.displayEntities([integration], true);

    return 0;
  }
}
