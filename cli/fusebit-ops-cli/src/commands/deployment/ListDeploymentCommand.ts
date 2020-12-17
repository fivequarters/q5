import { Command, IExecuteInput } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List Deployments',
  cmd: 'ls',
  summary: 'Lists deployments',
  description: 'Lists the deployments in the Fusebit platform.',
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class ListDeploymentCommand extends Command {
  public static async create() {
    return new ListDeploymentCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const output = input.options.output as string;

    const deploymentService = await DeploymentService.create(input);

    if (output === 'json') {
      const accounts = await deploymentService.listAllDeployments();
      await deploymentService.displayDeployments(accounts);
    } else {
      let getMore = true;
      let result;
      while (getMore) {
        result = await deploymentService.listDeployments(result);
        await deploymentService.displayDeployments(result.items);
        getMore = result.next ? await deploymentService.confirmListMore() : false;
      }
    }

    return 0;
  }
}
