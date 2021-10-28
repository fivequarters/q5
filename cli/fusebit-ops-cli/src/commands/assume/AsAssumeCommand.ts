import { Command, IExecuteInput } from '@5qtrs/cli';
import { AssumeService, DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Assume Role As User',
  cmd: 'as',
  summary: 'Assume a specific role in ann account and subscription',
  arguments: [
    {
      name: 'deployment',
      description: 'The deployment to assume a role within',
    },
    {
      name: 'accountId',
      description: 'The account ID to assume',
    },
    {
      name: 'subscriptionId',
      description: 'The subscription ID to assume',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },
    {
      name: 'output',
      aliases: ['o'],
      description: "Open the browser or return a raw JWT string: 'manage', 'raw'",
      default: 'manage',
    },
    {
      name: 'path',
      aliases: ['p'],
      description: 'The path to append the #access_token=JWT',
      default: '/callback?silentAuth=false&requestedPath=/',
    },
    {
      name: 'hostname',
      aliases: ['h'],
      description: 'The hostname of the manage.fusebit.io instance to use',
      default: 'https://manage.fusebit.io',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AsAssumeCommand extends Command {
  public static async create() {
    return new AsAssumeCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const [deploymentName, accountId, subscriptionId] = input.arguments as string[];

    const deploymentService = await DeploymentService.create(input);
    const service = await AssumeService.create(input);

    const deployment = await deploymentService.getSingleDeployment(deploymentName, input.options.region as string);

    const jwt = await service.createJwt(deployment, accountId, subscriptionId);

    process.stderr.write(
      `Token created for:\n\tAccount: ${jwt.accountId}\n\tSubscription: ${jwt.subscriptionId}\n\tUser: ${jwt.userId}\n`
    );

    if (input.options.output === 'raw') {
      input.io.writeLineRaw(jwt.jwt);
      return 0;
    }

    service.openManage({ hostname: input.options.hostname as string, path: input.options.path as string }, jwt.jwt);

    return 0;
  }
}
