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

export class ListDeploymentCommand extends Command {
  public static async create() {
    return new ListDeploymentCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const format = input.options.format as string;

    const deploymentService = await DeploymentService.create(input);

    if (format === 'json') {
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
