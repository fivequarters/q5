import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, ConnectorService } from '../../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Deploy Connector',
  cmd: 'deploy',
  summary: 'Deploy a connector',
  description: Text.create('Builds and deploys a connector using the project files in the given directory.'),
  arguments: [
    {
      name: 'connector',
      description: 'The id of the connector to deploy',
      required: true,
    },
  ],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A path to the directory with the connector source code to deploy',
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
      name: 'fast',
      aliases: ['f'],
      description: 'If set to true, does not wait for the connector to initialize.',
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

export class ConnectorDeployCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ConnectorDeployCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const connectorId = input.arguments[0] as string;
    const sourceDir = input.options.dir as string;
    const fast = input.options.fast as boolean;

    const connectorService = await ConnectorService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const sourcePath = sourceDir ? join(process.cwd(), sourceDir) : process.cwd();
    const connectorSpec = await connectorService.loadDirectory(sourcePath);

    await connectorService.confirmDeploy(sourcePath, connectorSpec, connectorId);

    let entity = await connectorService.deployEntity(connectorId, connectorSpec);
    if (!fast) {
      const response = await connectorService.waitForEntity(connectorId);
      entity = response.data;
    }
    await connectorService.displayEntities([entity], true);

    return 0;
  }
}
