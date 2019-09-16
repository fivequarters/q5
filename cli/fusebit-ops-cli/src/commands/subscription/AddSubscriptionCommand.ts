import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Subscription',
  cmd: 'add',
  summary: 'Add a subscription',
  description: 'Adds a new Fusebit subscription to a new or existing Fusebit account in a deployment.',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of an existing deployment',
    },
  ],
  options: [
    {
      name: 'account',
      description:
        'The Fusebit account ID to add a new subscription under. If unspecified, a new account will be created.',
    },
    {
      name: 'accountName',
      description: 'The display name of a new Fusebit account',
    },
    {
      name: 'accountEmail',
      description: 'The primary contact e-mail address of a new Fusebit account',
    },
    {
      name: 'subscriptionName',
      description: 'The display name of a new Fusebit subscription',
    },
    {
      name: 'region',
      description: 'The region of the deployment; required if the deployment is not globally unique',
      defaultText: 'deployment region',
    },
    {
      name: 'confirm',
      aliases: ['c'],
      description:
        'If set to true, prompts for confirmation before adding the new subscription to the Fusebit deployment',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AddSubscriptionCommand extends Command {
  public static async create() {
    return new AddSubscriptionCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName] = input.arguments as string[];
    const account = input.options.account as string;
    const accountName = input.options.accountName as string;
    const accountEmail = input.options.accountEmail as string;
    const subscriptionName = input.options.subscriptionName as string;
    const region = input.options.region as string;
    const confirm = input.options.confirm as boolean;

    const deploymentService = await DeploymentService.create(input);

    const subscription = {
      account,
      deploymentName,
      region,
      accountName,
      accountEmail,
      subscriptionName,
    };

    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);
    subscription.region = deployment.region;

    if (confirm) {
      await deploymentService.confirmAddSubscription(subscription);
    }

    const addedSubscription = await deploymentService.addSubscription(subscription);
    await deploymentService.displaySubscription(addedSubscription);

    return 0;
  }
}
