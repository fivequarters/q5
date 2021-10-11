import { Command, ICommand, IExecuteInput, ArgType } from '@5qtrs/cli';
import { WafService } from '../../../../services';

const command: ICommand = {
  name: 'Block IP',
  cmd: 'block',
  summary: 'Block IP from Fusebit platform',
  description: 'This blocks a IP/Subnet from the Fusebit platform.',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The name of the deployment.',
    },
    {
      name: 'ip',
      description: 'The IP/Subnet that you want to block from the Fusebit platform',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment.',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before blocking the IP from the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

export class BlockIPCommand extends Command {
  public static async create() {
    return new BlockIPCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName, ip] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    if (input.options.confirm as boolean) {
      await svc.confirmBlockIP(ip);
    }
    await svc.blockIPFromWaf(deploymentName, ip, region);
    return 0;
  }
}
