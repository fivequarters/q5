import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../../services/MonitoringService';

const command: ICommand = {
  name: 'Demote Monitoring Stack',
  cmd: 'demote',
  summary: 'Demote Fusebit Monitoring Stack',
  description: 'Demote a Fusebit Monitoring Stack',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The Monitoring Deployment you want to demote stacks from',
    },
    {
      name: 'stackId',
      description: 'The id of the stack you want to demote',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'the region of the Fusebit Monitoring deployment',
    },
  ],
};

export class DemoteStackCommand extends Command {
  public static async create() {
    return new DemoteStackCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName, stackId] = input.arguments as string[];
    let region = input.options.region as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.StackDemote(deploymentName, parseInt(stackId), region);
    return 0;
  }
}
