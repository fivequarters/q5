import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set Defaults',
  cmd: 'set',
  summary: 'Set the defaults for subscriptions on this deployment',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of an existing deployment',
    },
    {
      name: 'key',
      description: `Defaults Key, one of ['subscription']`,
    },
    {
      name: 'defaultsOrDotKey',
      description: 'String enclosed defaults or dot notation path to delete',
    },
  ],
  options: [
    {
      name: 'delete',
      description: 'Delete the object or key specified via dot notation.',
      defaultText: 'example.value.some-location',
      aliases: ['d'],
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

export class SetDefaultsCommand extends Command {
  public static async create() {
    return new SetDefaultsCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName, key, defaultsOrDotKey] = input.arguments as string[];
    const region = input.options.region as string;
    const deleteMode = input.options.delete as boolean;

    const deploymentService = await DeploymentService.create(input);
    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);

    if (deleteMode) {
      await deploymentService.unsetDefaults(deployment, key, defaultsOrDotKey);
    } else {
      await deploymentService.setDefaults(deployment, key, JSON.parse(defaultsOrDotKey));
    }

    await deploymentService.displayDefaults(deployment);

    return 0;
  }
}
