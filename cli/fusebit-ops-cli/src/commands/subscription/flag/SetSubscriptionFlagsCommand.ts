import { Command, IExecuteInput, ArgType, Message, MessageKind, ICommandIO } from '@5qtrs/cli';
import { DeploymentService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set subscription flags',
  cmd: 'set',
  summary: 'Sets flags on a subscription.',
  description:
    'Sets flags on a subscription. This command will not overwrite flags set previously unless they are explicitly set here.',
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
      name: 'region',
      description: 'The region of the deployment; required if the deployment is not globally unique',
      defaultText: 'deployment region',
    },
  ],
  acceptsUnknownArguments: true,
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
    const flags = await this.extractFlags(input);
    const region = input.options.region as string;

    const deploymentService = await DeploymentService.create(input);
    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);

    const subscription = {
      deploymentName: deployment.deploymentName,
      region: deployment.region,
      account: accountId,
      subscription: subscriptionId,
      flags,
    };

    await deploymentService.setSubscriptionFlags(subscription);

    await deploymentService.displaySubscription(subscription);

    return 0;
  }

  private async extractFlags(input: IExecuteInput) {
    const flagsAndValues = input.arguments.splice(3);

    if (!flagsAndValues || flagsAndValues.length === 0) {
      await this.throwCommandError('No flags found.', input.io);
    }

    const flags: { [key: string]: any } = {};

    for (const flagAndValue of flagsAndValues) {
      if (typeof flagAndValue !== 'string') {
        await this.throwCommandError(`Invalid format on the '${flagAndValue}' flag.`, input.io);
        return;
      }
      const [key, value] = flagAndValue.split('=');
      flags[key] = value;
    }
    return flags;
  }

  private async throwCommandError(messagePrefix: string, io: ICommandIO) {
    const errorMessage = `${messagePrefix} Expected format: flag-name=flag-value`;
    const message = await Message.create({
      header: 'Invalid Set of Flags',
      message: errorMessage,
      kind: MessageKind.error,
    });
    await message.write(io);
    throw new Error(errorMessage);
  }
}
