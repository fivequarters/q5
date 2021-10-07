import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { WafService } from '../../../../services';

const command: ICommand = {
  name: 'Unblock IP',
  cmd: 'unblock',
  summary: 'Unblock IP from Fusebit platform',
  description: 'This blocks a IP/Subnet from the Fusebit platform.',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The name of the deployment.',
    },
    {
      name: 'ip',
      description: 'The IP/Subnet that you want to unblock from the Fusebit platform',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'the region of the deployment.',
    },
  ],
};

export class UnblockIPCommand extends Command {
  public static async create() {
    return new UnblockIPCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName, ip] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    await svc.unblockIPFromWaf(deploymentName, ip, region);
    return 0;
  }
}
