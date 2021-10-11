import { Command, ICommand, IExecuteInput, ArgType } from '@5qtrs/cli';
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
      description: 'If set to true, prompts for confirmation before applying the RegEx filter to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
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
    let regex =
      (input.options.regex as string) ||
      `^.*${input.options.accountName}.*$` ||
      `^.*${input.options.subscriptionName}.*$`;
    if (regex === '') {
      throw Error('No regex input detected');
    }
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    if (input.options.confirm as boolean) {
      await svc.confirmBlockRegex(regex);
    }
    await svc.blockRegExFromWaf(deploymentName, regex, region);
    return 0;
  }
}
