import { Command, IExecuteInput } from '@5qtrs/cli';
import { ConnectorService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Connector Logs',
  cmd: 'log',
  summary: 'Stream real-time logs',
  description: 'Streams real-time logs from a given connector.',
  arguments: [
    {
      name: 'connector',
      description: 'The connector id to stream real-time logs from',
      required: true,
    },
  ],
  options: [
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

export class ConnectorLogCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new ConnectorLogCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const connectorId = input.arguments[0] as string;

    const executeService = await ExecuteService.create(input);
    const connectorService = await ConnectorService.create(input);

    await executeService.newLine();

    await connectorService.getEntityLogs(connectorId);

    return 0;
  }
}
