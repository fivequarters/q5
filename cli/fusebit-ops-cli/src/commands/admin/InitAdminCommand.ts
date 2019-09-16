import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Admin',
  cmd: 'init',
  summary: 'Create a Fusebit administrator',
  description: 'Adds a new Fusebit user with administrative permissions to an existing Fusebit account',
  arguments: [
    {
      name: 'deployment',
      description: 'The name of an existing deployment',
    },
    {
      name: 'account',
      description: 'The ID of an existing Fusebit account',
    },
  ],
  options: [
    {
      name: 'subscription',
      description: 'The Fusebit subscription ID to become the default subscription of the new administrator',
    },
    {
      name: 'first',
      description: 'First name',
    },
    {
      name: 'last',
      description: 'Last name',
    },
    {
      name: 'email',
      description: 'Email',
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
        'If set to true, prompts for confirmation before creating a new user and granting them administrative permissions to the Fusebit account',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class InitAdminCommand extends Command {
  public static async create() {
    return new InitAdminCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [deploymentName, account] = input.arguments as string[];
    const subscription = input.options.subscription as string;
    const first = input.options.first as string;
    const last = input.options.last as string;
    const email = input.options.email as string;
    const region = input.options.region as string;
    const confirm = input.options.confirm as boolean;

    const deploymentService = await DeploymentService.create(input);

    const init = {
      deploymentName,
      account,
      subscription,
      region,
      first,
      last,
      email,
    };

    const deployment = await deploymentService.getSingleDeployment(deploymentName, region);
    init.region = deployment.region;

    if (confirm) {
      await deploymentService.confirmInitAdmin(init);
    }

    const initResult = await deploymentService.initAdmin(deployment, init);
    await deploymentService.displayInit(initResult);

    return 0;
  }
}
