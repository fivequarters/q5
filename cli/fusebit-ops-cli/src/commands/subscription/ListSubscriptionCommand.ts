import { Command, IExecuteInput } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'List subscriptions',
  cmd: 'ls',
  summary: 'Lists subscriptions',
  description: 'Lists the Fusebit accounts and subscriptions in a Fusebit deployment.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of an existing deployment',
    },
  ],
  options: [
    {
      name: 'output',
      aliases: ['o'],
      description: "The format to display the output: 'pretty', 'json'",
      default: 'pretty',
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

export class ListSubscriptionCommand extends Command {
  public static async create() {
    return new ListSubscriptionCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string;

    const deploymentService = await DeploymentService.create(input);
    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);
    const accounts = await deploymentService.listAllSubscriptions(deployment);
    await deploymentService.displaySubscriptions(deployment, accounts);

    return 0;
  }
}
