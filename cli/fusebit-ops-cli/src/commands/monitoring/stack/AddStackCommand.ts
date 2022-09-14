import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import {
  MonitoringService,
  GRAFANA_DEFAULT_VERSION,
  LOKI_DEFAULT_VERSION,
  TEMPO_DEFAULT_VERSION,
} from '../../../services/MonitoringService';

const command: ICommand = {
  name: 'Add Monitoring Stack',
  cmd: 'add',
  summary: 'Add a Fusebit Monitoring Stack',
  description: 'Add a monitoring stack to the Fusebit platform.',
  arguments: [
    {
      name: 'monitoringName',
      description: 'The monitoring deployment you want to add stacks against.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region that the Fusebit monitoring deployment resides in.',
    },
    {
      name: 'grafanaTag',
      description: `The version of the Grafana docker image, defaults to ${GRAFANA_DEFAULT_VERSION}`,
    },
    {
      name: 'lokiTag',
      description: `The version of the Loki docker image, defaults to ${LOKI_DEFAULT_VERSION}`,
    },
    {
      name: 'tempoTag',
      description: `The version of the Tempo docker image, defaults to ${TEMPO_DEFAULT_VERSION}`,
    },
    {
      name: 'ami',
      description: 'AMI ID to use instead of the official Ubuntu AMI',
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
    const svc = await MonitoringService.create(input);
    let region = input.options.region as string | undefined;
    let grafanaTag = await svc.getGrafanaImage(input.options.grafanaTag as string | undefined);
    let lokiTag = await svc.getLokiImage(input.options.lokiTag as string | undefined);
    let tempoTag = await svc.getTempoImage(input.options.tempoTag as string | undefined);
    let ami = input.options.ami as string | undefined;
    await svc.stackAdd(monitoringName, grafanaTag, tempoTag, lokiTag, region, ami);
    return 0;
  }
}
