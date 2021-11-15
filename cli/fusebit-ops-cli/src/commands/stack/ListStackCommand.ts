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
      name: 'region',
      description: 'The region of the deployment; required if the deployment is not globally unique',
      defaultText: 'deployment region',
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
    const region = input.options.region as string;
    const output = input.options.output as string;

    const stackService = await StackService.create(input);
    const deploymentService = await DeploymentService.create(input);
    const deployments = await deploymentService.listAllDeployments();

    if (output === 'json') {
      const stacks = await stackService.listAllStacks({ deploymentName, region });
      await stackService.displayStacks(stacks, deployments);
    } else {
      let getMore = true;
      let result;
      const options: any = { deploymentName, region };
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
