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
      description: 'The monitoring deployment you want to promote stacks in.',
    },
    {
      name: 'stackId',
      description: 'The id of the stack you want to promote.',
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
    const [deploymentName, stackId] = input.arguments as string[];
    let region = input.options.region as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.StackPromote(deploymentName, parseInt(stackId), region);
    return 0;
  }
}
