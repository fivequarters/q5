import { Command, IExecuteInput } from '@5qtrs/cli';
import { IntegrationService, ExecuteService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Integration Logs',
  cmd: 'log',
  summary: 'Stream real-time logs',
  description: 'Streams real-time logs from a given integration.',
  arguments: [
    {
      name: 'integration',
      description: 'The integration id to stream real-time logs from',
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

export class IntegrationLogCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new IntegrationLogCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const integrationId = input.arguments[0] as string;

    const executeService = await ExecuteService.create(input);
    const integrationService = await IntegrationService.create(input);

    await executeService.newLine();

    await integrationService.getEntityLogs(integrationId);

    return 0;
  }
}
