import { Command, ICommand, IExecuteInput } from '@5qtrs/cli';
import { WafService } from '../../../../services';

const command: ICommand = {
  name: 'List RegEx Filters',
  cmd: 'ls',
  summary: 'List RegEx filters from Fusebit platform',
  description: 'This lists all RegEx filters on the Fusebit platform.',
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

export class ListRegExCommand extends Command {
  public static async create() {
    return new ListRegExCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string | undefined;
    const svc = await WafService.create(input);
    await svc.ListRegExFromWaf(deploymentName, region);
    return 0;
  }
}
