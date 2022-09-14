import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { LogService } from '../../../services';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Statistics',
  cmd: 'stats',
  summary: 'Get statistics matching the search criteria and aggregation parameters',
  description: Text.create('Retrieves aggregation of statistics over logs matching the specified search criteria.'),
  arguments: [
    {
      name: 'filter',
      description:
        'Specify "all", "error", or a search filter in the Cloud Watch Logs Insights format (https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html), for example "response.statusCode = 500".',
      required: true,
    },
    {
      name: 'aggregation',
      description:
        'Specify "request", "status", or an aggregation clause in the Cloud Watch Logs Insights format (https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html). For example, "count(*) by bin(15s)"',
      required: false,
      default: 'count(*) by bin(15s)',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class LogStatsCommand extends Command {
  private constructor() {
    super(command);
  }

  public static async create() {
    return new LogStatsCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let filter: string | undefined = input.arguments[0] as string;
    let stats: string | undefined = input.arguments[1] as string | undefined;

    if (filter === 'all') {
      filter = undefined;
    } else if (filter === 'error') {
      filter = 'response.statusCode >= 400';
    }
    if (stats === 'request') {
      stats = 'count(*) by bin(15s)';
    } else if (stats === 'status') {
      stats = 'count(*) by response.statusCode';
    }

    const logService = await LogService.create(input);
    await logService.displayParams(filter, stats);
    const result = await logService.getLogs(filter, stats);
    await logService.displayStats(result);

    return 0;
  }
}
