import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set subscription flags',
  cmd: 'set-flags',
  summary: 'Sets flags on the subscription.',
  description:
    'Sets flags on the subscription. This command will not override previous values unless they are explicitly set.',
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
  ],
  options: [
    {
      name: 'staticIp',
      description:
        'If set to true, this flag will allow functions belonging to this subscription to use a static IP address while running.',

      default: 'false',
      type: ArgType.boolean,
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

export class SetSubscriptionFlagsCommand extends Command {
  public static async create() {
    return new SetSubscriptionFlagsCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName, accountId, subscriptionId] = input.arguments as string[];
    const staticIp = input.options.staticIp as boolean;

    const region = input.options.region as string;

    const deploymentService = await DeploymentService.create(input);
    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);

    const subscription = {
      deploymentName: deployment.deploymentName,
      region: deployment.region,
      account: accountId,
      subscription: subscriptionId,
      flags: { staticIp },
    };

    await deploymentService.setSubscriptionFlags(subscription);

    await deploymentService.displaySubscription(subscription);

    return 0;
  }
}
