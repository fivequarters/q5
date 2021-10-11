import { Command, ICommand, IExecuteInput, ArgType } from '@5qtrs/cli';
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
  ],
  options: [
    {
      name: 'regex',
      description: 'The RegEx that you want to block from the Fusebit platform',
    },
    {
      name: 'region',
      description: 'The region of the deployment.',
    },
    {
      name: 'accountName',
      description: 'The account to disable.',
    },
    {
      name: 'subscriptionName',
      description: 'The subscription to disable.',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before removing the RegEx filter to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
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
    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    let regex =
      (input.options.regex as string) ||
      `^.*${input.options.accountName}.*$` ||
      `^.*${input.options.subscriptionName}.*$`;
    if (regex === '') {
      throw Error('No regex input detected');
    }
    if (input.options.confirm) {
      await svc.confirmUnblockRegex(regex);
    }
    await svc.unblockRegExFromWaf(deploymentName, regex, region);
    return 0;
  }
}
