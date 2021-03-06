import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Subscription',
  cmd: 'limit',
  summary: 'Limit a subscriptions concurrency',
  description: 'Limit the maximum number of concurrent function invocations allowed to a subscription.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of an existing deployment',
    },
    {
      name: 'account',
      description: 'The Fusebit account ID.',
    },
    {
      name: 'subscription',
      description: 'The Fusebit subscription ID.',
    },
    {
      name: 'limit',
      description:
        "The maximum number of concurrent function executions, 0 for unlimited, or 'block' to deny all invocations.",
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

export class LimitSubscriptionCommand extends Command {
  public static async create() {
    return new LimitSubscriptionCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName, accountId, subscriptionId] = input.arguments as string[];
    let limit = (input.arguments as string[]).pop() as string;
    const region = input.options.region as string;

    const deploymentService = await DeploymentService.create(input);
    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);

    if (limit === 'block') {
      limit = '-1';
    }

    const subscription = {
      deploymentName: deployment.deploymentName,
      region: deployment.region,
      account: accountId,
      subscription: subscriptionId,
      limits: { concurrency: Number.parseInt(limit, 10) },
    };

    await deploymentService.limitSubscription(subscription);

    await deploymentService.displaySubscription(subscription);

    return 0;
  }
}
