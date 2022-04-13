import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { join } from 'path';
import { ConnectorService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Connector',
  cmd: 'get',
  summary: 'Get a connector',
  description: Text.create('Get a connector and place it into the target directory.'),
  arguments: [
    {
      name: 'connector',
      description: 'The id of the connector to get',
      required: true,
    },
  ],
  options: [
    {
      name: 'dir',
      aliases: ['d'],
      description: 'A relative path to the directory to place the connector code.',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ConnectorGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ConnectorGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const connectorId = input.arguments[0] as string;
    const destDir = input.options.dir as string;

    const connectorService = await ConnectorService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    const connector = await connectorService.fetchEntity(connectorId);

    if (destDir) {
      const destPath = join(process.cwd(), destDir);

      await connectorService.writeDirectory(destPath, connector);
    } else {
      await connectorService.displayEntities([connector], true);
    }

    return 0;
  }
}
