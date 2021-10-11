import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { WafService } from '../../../services';

const command: ICommand = {
  name: 'Get WAF',
  cmd: 'get',
  summary: 'Get Fusebit Waf',
  description: 'Get information about the Fusebit WAF',
  arguments: [
    {
      name: 'deploymentName',
      description: 'The name of the deployment',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

export class GetWafCommand extends Command {
  public static async create() {
    return new GetWafCommand();
  }

  private constructor() {
    super(command);
  }
  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    await svc.getWaf(deploymentName, region);
    return 0;
  }
}
