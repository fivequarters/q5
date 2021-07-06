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
    const connectorId = input.arguments[0] as string;

    const executeService = await ExecuteService.create(input);
    const connectorService = await ConnectorService.create(input);

    await executeService.newLine();

    await connectorService.confirmRemove(connectorId);

    await connectorService.removeEntity(connectorId);

    return 0;
  }
}
