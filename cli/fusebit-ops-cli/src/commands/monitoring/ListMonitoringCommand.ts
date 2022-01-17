import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../services';

const command: ICommand = {
  name: 'List Monitoring Deployments',
  cmd: 'ls',
  summary: 'List Fusebit Monitoring Deployments',
  description: 'List Fusebit Monitoring Deployments',
};

export class ListMonitoringCommand extends Command {
  public static async create() {
    return new ListMonitoringCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const svc = await MonitoringService.create(input);
    await svc.MonitoringList();
    return 0;
  }
}
