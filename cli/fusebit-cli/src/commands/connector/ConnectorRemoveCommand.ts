import { Text } from '@5qtrs/text';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ConnectorService, ExecuteService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Remove Connector',
  cmd: 'rm',
  summary: 'Remove a deployed connector',
  description: 'Permanently removes a deployed connector.',
  arguments: [
    {
      name: 'connector',
      description: 'The connector id of the connector to remove',
      required: true,
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
};

// ----------------
// Exported Classes
// ----------------

export class ConnectorRemoveCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ConnectorRemoveCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const entityId = input.arguments[0] as string;

    const executeService = await ExecuteService.create(input);
    const connectorService = await ConnectorService.create(input);

    await executeService.newLine();

    await connectorService.confirmRemove(entityId);

    let result;

    result = await connectorService.removeEntity(entityId);

    if (result.status === 404) {
      await executeService.result(
        'Not Found',
        Text.create(`${connectorService.entityTypeName} '`, Text.bold(entityId), `' not found`)
      );
      return 0;
    }

    result = await connectorService.waitForEntity(entityId);

    await executeService.result(
      'Removed',
      Text.create(`${connectorService.entityTypeName} '`, Text.bold(entityId), `' removal completed`)
    );

    return 0;
  }
}
