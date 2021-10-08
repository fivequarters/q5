import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { WafService } from '../../../../services';

const command: ICommand = {
  name: 'Block RegEx',
  cmd: 'block',
  summary: 'Block RegEx from Fusebit platform',
  description: 'This blocks a regex path from the Fusebit platform.',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The name of the deployment.',
    },
  ],
  options: [
    {
      name: 'regex',
      description: 'The RegEx that you want to block from the Fusebit platform',
    },
    {
      name: 'region',
      description: 'the region of the deployment.',
    },
    {
      name: 'accountName',
      description: 'The account to disable.',
    },
    {
      name: 'subscriptionName',
      description: 'The subscription to disable.',
    },
  ],
};

export class BlockRegExCommand extends Command {
  public static async create() {
    return new BlockRegExCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName] = input.arguments as string[];
    let regex: string;
    if (typeof input.options.regex === 'string') {
      regex = input.options.regex as string;
    } else if (typeof input.options.accountName === 'string') {
      regex = `^.*${input.options.accountName}.*$`;
    } else if (typeof input.options.subscriptionName === 'string') {
      regex = `^.*${input.options.subscriptionName}.*$`;
    } else {
      throw Error('No regex input detected');
    }
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    await svc.blockRegExFromWaf(deploymentName, regex, region);
    return 0;
  }
}
