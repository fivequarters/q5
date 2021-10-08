import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { WafService } from '../../../../services';

const command: ICommand = {
  name: 'List IP Filters',
  cmd: 'ls',
  summary: 'List IP filters from Fusebit platform',
  description: 'This lists all IP filters on the Fusebit platform.',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The name of the deployment.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'the region of the deployment.',
    },
  ],
};

export class ListIPCommand extends Command {
  public static async create() {
    return new ListIPCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    await svc.ListIPFromWaf(deploymentName, region);
    return 0;
  }
}
