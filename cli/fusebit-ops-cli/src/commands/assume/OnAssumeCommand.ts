import { Command, IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';

import { ExecuteService, AssumeService, DeploymentService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Assume Role As User',
  cmd: 'on',
  summary: 'Assume a specific role in an account and subscription',
  arguments: [
    {
      name: 'defaults',
      description:
        'The name of the defaults to use.  Currently supported are "manage", "stage", "develop", and "custom".  If "custom" is specified, then the hostname and deployment must also be specified.',
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
      name: 'deployment',
      description: 'Specify the deployment to assume a role within',
    },
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },
    {
      name: 'action',
      aliases: ['o'],
      description: "Open the browser, print the created url, or return a raw JWT string: 'manage', 'url', 'jwt'",
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
      description: 'The hostname of the manage.fusebit.io instance to use',
      defaultText: 'https://manage.fusebit.io',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class OnAssumeCommand extends Command {
  public static async create() {
    return new OnAssumeCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const executeService = await ExecuteService.create(input);
    const [defaults, accountId, subscriptionId] = input.arguments as string[];

    let deploymentName = input.options.deployment as string;
    let region = input.options.region as string;
    let hostname = input.options.hostname as string;
    const path = input.options.path as string;
    const action = input.options.action as string;

    const isActionJwt = action === 'jwt';
    const isActionUrl = action === 'url';
    const isActionManage = action === 'manage';

    if (!isActionJwt && !isActionUrl && !isActionManage) {
      executeService.error('Invalid Action', Text.create(`Action must be 'jwt', 'url', or 'manage'`));
      throw new Error('Invalid Action');
    }

    const defaultValues: Record<string, { deploymentName: string; region: string; hostname: string }> = {
      manage: {
        deploymentName: 'api',
        region: 'us-west-1',
        hostname: 'https://manage.fusebit.io',
      },
      stage: {
        deploymentName: 'stage',
        region: 'us-west-2',
        hostname: 'https://stage-manage.fusebit.io',
      },
      custom: {
        deploymentName,
        region,
        hostname,
      },
    };

    deploymentName = deploymentName || defaultValues[defaults]?.deploymentName;
    region = region || defaultValues[defaults]?.region;
    hostname = hostname || defaultValues[defaults]?.hostname;

    if (!deploymentName || !region || !hostname) {
      executeService.error('Missing Parameters', Text.create(`The deployment, region, or hostname were missing.`));
      throw new Error('Missing parameters');
    }

    if (isActionJwt || isActionUrl) {
      // Prevent stdout output when being used for tools.
      input.options.output = 'raw';
    }

    const deploymentService = await DeploymentService.create(input);
    const service = await AssumeService.create(input);

    const deployment = await deploymentService.getSingleDeployment(deploymentName, region as string);

    try {
      const authBundle = await service.createAuthBundle(deployment, accountId, subscriptionId);

      if (isActionJwt || isActionUrl) {
        process.stderr.write(
          `Token created for account ${authBundle.accountId} as ${authBundle.userId} on ${deployment.deploymentName}.${deployment.region}.${deployment.domainName}\n\n`
        );
      }

      if (isActionJwt) {
        input.io.writeLineRaw(authBundle.jwt);
        return 0;
      }

      if (isActionUrl) {
        const url = service.makeUrl({ hostname, path }, authBundle);
        await input.io.writeLineRaw(url);
        return 0;
      }

      service.openManage({ hostname, path }, deployment, authBundle);
    } catch (error) {
      if (isActionJwt || isActionUrl) {
        process.stderr.write(`Error: ${error.message}\n`);
      }
      throw error;
    }
    return 0;
  }
}
