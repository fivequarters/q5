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
  arguments: [
    {
      name: 'connector',
      description: 'The id of the connector to initialize.',
      required: true,
    },
  ],
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
    const connectorId = input.arguments[0] as string;
    const sourceDir = input.options.dir as string;

    const connectorService = await ConnectorService.create(input);
    const operationService = await OperationService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const sourcePath = sourceDir ? join(process.cwd(), sourceDir) : process.cwd();
    const connectorSpec = await connectorService.loadDirectory(sourcePath);

    await connectorService.confirmDeploy(sourcePath, connectorSpec, connectorId);

    const operation = await connectorService.deployConnector(connectorId, connectorSpec);
    const result = await operationService.waitForCompletion(operation.operationId);
    await operationService.displayOperationResults(result);

    const connector = await connectorService.fetchConnector(connectorId);

    await connectorService.writeDirectory(sourcePath, connector);

    return 0;
  }
}
