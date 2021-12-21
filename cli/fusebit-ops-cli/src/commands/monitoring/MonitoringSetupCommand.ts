import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../services';

const command: ICommand = {
  name: 'Setup Monitoring',
  cmd: 'setup',
  summary: 'Setup Fusebit Monitoring',
  description: 'Setup network infrastructure for Fusebit',
  arguments: [
    {
      name: 'networkName',
      description: 'the name of the network',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'the region of the network',
    },
  ],
};

export class SetupMonitoringCommand extends Command {
  public static async create() {
    return new SetupMonitoringCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [networkName] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.setupMonitoring(networkName, region);
    return 0;
  }
}
