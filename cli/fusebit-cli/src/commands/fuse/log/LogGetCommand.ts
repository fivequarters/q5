import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ExecuteService, LogService, ProfileService } from '../../../services';
import { join } from 'path';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Logs',
  cmd: 'get',
  summary: 'Get logs matching the search criteria',
  description: Text.create('Retrieves execution logs matching the specified search criteria.'),
  arguments: [
    {
      name: 'filter',
      description:
        'Specify "all", "error", or a search filter in the Cloud Watch Logs Insights format (https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html), for example "response.statusCode = 500".',
      required: true,
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class LogGetCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new LogGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let filter: string | undefined = input.arguments[0] as string | undefined;

    if (filter === 'all') {
      filter = undefined;
    } else if (filter === 'error') {
      filter = 'response.statusCode >= 400';
    }

    const logService = await LogService.create(input);
    await logService.displayParams(filter);
    const logs = await logService.getLogs(filter);
    await logService.displayLogs(logs);

    return 0;
  }
}
