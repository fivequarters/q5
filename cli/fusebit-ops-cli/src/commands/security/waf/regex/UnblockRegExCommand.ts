import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { WafService } from '../../../../services';

const command: ICommand = {
  name: 'Unblock RegEx',
  cmd: 'unblock',
  summary: 'Unblock RegEx from Fusebit platform',
  description: 'This unblocks a regex path from the Fusebit platform.',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The name of the deployment.',
    },
    {
      name: 'regex',
      description: 'The RegEx that you want to unblock from the Fusebit platform',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'the region of the deployment.',
    },
  ],
};

export class UnblockRegExCommand extends Command {
  public static async create() {
    return new UnblockRegExCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName, regex] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    await svc.unblockRegExFromWaf(deploymentName, regex, region);
    return 0;
  }
}
