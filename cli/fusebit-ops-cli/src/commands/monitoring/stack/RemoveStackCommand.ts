import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../../services/MonitoringService';

const command: ICommand = {
  name: 'Remove Monitoring Stack',
  cmd: 'rm',
  summary: 'Remove a Fusebit Monitoring Stack',
  description: 'Remove a stack from the Fusebit platform.',
  arguments: [
    {
      name: 'monitoringDeploymentName',
      description: 'The monitoring deployment you want to remove stacks from, or deploymentName:stackId.',
    },
    {
      name: 'stackid',
      description: 'The id of the stack you want to remove.',
      required: false,
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region that the monitoring deployment resides.',
    },
    {
      name: 'force',
      aliases: ['f'],
      description: 'If set to true, will force deletion even if it is the last active stack.',
    },
  ],
};

export class RemoveStackCommand extends Command {
  public static async create() {
    return new RemoveStackCommand();
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
    const force = input.options.force;
    await svc.stackRemove(deploymentName, stackId, force !== undefined, region);
    return 0;
  }
}
