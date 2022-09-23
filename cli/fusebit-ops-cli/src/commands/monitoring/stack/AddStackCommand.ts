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
    {
      name: 'lokiVersion',
      description: 'The version of the Loki docker image.',
    },
    {
      name: 'tempoVersion',
      description: 'The version of the tempo docker image.',
    },
    {
      name: 'grafanaVersion',
      description: 'The version of the tempo docker image.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region that the Fusebit monitoring deployment resides in.',
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
    const [monitoringName, lokiVersion, tempoVersion, grafanaVersion] = input.arguments as string[];
    const svc = await MonitoringService.create(input);
    let region = input.options.region as string | undefined;
    let grafanaTag = await svc.getGrafanaImage(grafanaVersion);
    let lokiTag = await svc.getLokiImage(lokiVersion);
    let tempoTag = await svc.getTempoImage(tempoVersion);
    let ami = input.options.ami as string | undefined;
    await svc.stackAdd(monitoringName, grafanaTag, tempoTag, lokiTag, region, ami);
    return 0;
  }
}
