import { Command, IExecuteInput } from '@5qtrs/cli';
import { StackService, DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Stacks',
  cmd: 'ls',
  summary: 'Lists stacks',
  description: 'Lists the stacks in the Fusebit platform.',
  options: [
    {
      name: 'deployment',
      description: 'The name of the deployment to filter by',
    },
    {
      name: 'format',
      aliases: ['f'],
      description: "The format to display the output: 'table', 'json'",
      default: 'table',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ListStackCommand extends Command {
  public static async create() {
    return new ListStackCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const deploymentName = input.options.deployment as string;
    const format = input.options.format as string;

    const stackService = await StackService.create(input);
    const deploymentService = await DeploymentService.create(input);
    const deployments = await deploymentService.listAllDeployments();

    if (format === 'json') {
      const stacks = await stackService.listAllStacks(deploymentName);
      await stackService.displayStacks(stacks, deployments);
    } else {
      let getMore = true;
      let result;
      let options: any = { deploymentName };
      while (getMore) {
        result = await stackService.listStacks(options);
        options.next = result.next || undefined;
        await stackService.displayStacks(result.items, deployments);
        getMore = result.next ? await stackService.confirmListMore() : false;
      }
    }

    return 0;
  }
}
