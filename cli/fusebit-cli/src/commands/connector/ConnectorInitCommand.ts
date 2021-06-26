import { join } from 'path';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, ConnectorService, OperationService } from '../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Initialize Connector',
  cmd: 'init',
  summary: 'Scaffold a new connector in the given directory',
  description: Text.create(
    'Scaffolds a new connector in the given directory. ',
    'If the directory is not specified, working directory is used.',
    Text.eol(),
    Text.eol(),
    "The connector can be later deployed using '",
    Text.bold('connector deploy'),
    "' command."
  ),
  arguments: [],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A path to the directory with the connector source code to deploy.',
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

export class ConnectorInitCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ConnectorInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const sourceDir = input.options.dir as string;

    const connectorService = await ConnectorService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const sourcePath = sourceDir ? join(process.cwd(), sourceDir) : process.cwd();

    const connector = connectorService.createNewSpec();
    await connectorService.writeDirectory(sourcePath, connector);

    await connectorService.displayConnectors([connector], true);

    return 0;
  }
}
