import { Command, IExecuteInput } from '@5qtrs/cli';
import { HealthCheckService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Enable Deployment Health Check',
  cmd: 'enable',
  summary: 'Enable the healthcheck system of a deployment.',
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

export class EnableDeploymentHealthCommand extends Command {
  public static async create() {
    return new EnableDeploymentHealthCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string;

    const healthCheckService = await HealthCheckService.create(input);
    await healthCheckService.ManageHealthCheck(deploymentName, true, region);

    return 0;
  }
}
