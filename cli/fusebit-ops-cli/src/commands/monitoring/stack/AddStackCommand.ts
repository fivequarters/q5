import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { MonitoringService } from '../../../services/MonitoringService';

const command: ICommand = {
  name: 'Add Monitoring Stack',
  cmd: 'add',
  summary: 'Add an Fusebit Monitoring Stack',
  description: 'Add an Fusebit Monitoring Stack',
  arguments: [
    {
      name: 'monitoringName',
      description: 'the monitoring deployment you want to add stacks against.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'the region of the network',
    },
    {
      name: 'grafanaTag',
      description: 'the tag of the Grafana docker image',
    },
    {
      name: 'lokiTag',
      description: 'the tag of the Loki docker image',
    },
    {
      name: 'tempoTag',
      description: 'the tag of the Tempo docker image',
    },
  ],
};

export class AddStackCommand extends Command {
  public static async create() {
    return new AddStackCommand();
  }

  constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [monitoringName] = input.arguments as string[];
    let region = input.options.region as string | undefined;
    let grafanaTag = input.options.grafanaTag as string | undefined;
    let lokiTag = input.options.lokiTag as string | undefined;
    let tempoTag = input.options.tempoTag as string | undefined;
    const svc = await MonitoringService.create(input);
    await svc.StackAdd(monitoringName, grafanaTag, tempoTag, lokiTag, region);
    return 0;
  }
}
