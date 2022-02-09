import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../services';

const command: ICommand = {
  name: 'Get Monitoring Deployment',
  cmd: 'get',
  summary: 'Get Fusebit Monitoring Deployment',
  description: 'Get details of a Fusebit monitoring deployment.',
  arguments: [
    {
      name: 'monitoringName',
      description: 'The monitoring deployment you want to get details about.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the monitoring deployment.',
    },
  ],
};

export class GetMonitoringCommand extends Command {
  public static async create() {
    return new GetMonitoringCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [monitoringName] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.monitoringGet(monitoringName, region);
    return 0;
  }
}
