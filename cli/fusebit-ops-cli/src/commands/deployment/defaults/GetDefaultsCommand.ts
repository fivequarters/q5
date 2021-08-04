import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Get Defaults',
  cmd: 'get',
  summary: 'Get the defaults for subscriptions on this deployment',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of an existing deployment',
    },
  ],
  options: [
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

export class GetDefaultsCommand extends Command {
  public static async create() {
    return new GetDefaultsCommand();
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

    await deploymentService.displayDefaults(deployment);

    return 0;
  }
}
