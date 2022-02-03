import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../../services/MonitoringService';

const command: ICommand = {
  name: 'Promote Monitoring Stack',
  cmd: 'promote',
  summary: 'Promote Fusebit Monitoring Stack',
  description: 'Promote a monitoring stack on the Fusebit platform.',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The monitoring deployment you want to promote stacks in, or deployment:stackId.',
    },
    {
      name: 'stackId',
      description: 'The id of the stack you want to promote, if not present on the deploymentName',
      required: false,
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region that the monitoring deployment resides.',
    },
  ],
};

export class PromoteStackCommand extends Command {
  public static async create() {
    return new PromoteStackCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let [deploymentName, stackId] = input.arguments as string[];
    if (deploymentName.indexOf(':') > 0 && !stackId) {
      [deploymentName, stackId] = deploymentName.split(':');
    }
    const region = input.options.region as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.stackPromote(deploymentName, parseInt(stackId, 10), region);
    return 0;
  }
}
