import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../services';

const command: ICommand = {
  name: 'Add Monitoring Deployment',
  cmd: 'add',
  summary: 'Add an Fusebit Monitoring Deployment',
  description: 'Add an Fusebit Monitoring Deployment',
  arguments: [
    {
      name: 'networkName',
      description: 'The name of the network.',
    },
    {
      name: 'deploymentName',
      description: 'The function-api deployment you want to use to back this monitoring deployment.',
    },
    {
      name: 'monitoringName',
      description: 'The name of the monitoring deployment you want to add to the Fusebit platform.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the network.',
    },
  ],
};

export class AddMonitoringCommand extends Command {
  public static async create() {
    return new AddMonitoringCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [networkName, deploymentName, monitoringName] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.monitoringAdd(networkName, deploymentName, monitoringName, region);
    return 0;
  }
}
