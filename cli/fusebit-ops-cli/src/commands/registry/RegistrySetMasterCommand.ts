import { AwsCreds } from '@5qtrs/aws-config';
import { ArgType, Command, IExecuteInput } from '@5qtrs/cli';
import { IFusebitAccount, IFusebitSubscriptionDetails, IOpsDeployment } from '@5qtrs/ops-data';
import { DeploymentService } from '../../services/DeploymentService';
import { ExecuteService } from '../../services/ExecuteService';
import { OpsService } from '../../services/OpsService';

import * as Constants from '@5qtrs/constants';

import { AwsRegistry, IRegistryGlobalConfig } from '@5qtrs/registry';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Set Master Registry Config',
  cmd: 'setMaster',
  summary: 'Set the master registry and managed scopes for global packages',
  description: 'Set the account and managed scopes to use as a master registry for deployment-wide packages.',
  arguments: [
    {
      name: 'deployment',
      description: 'The deployment to set the master registry for.',
    },
    {
      name: 'accountId',
      description: 'The account ID to use as a master registry',
    },
    {
      name: 'scopes',
      description: 'Comma separated list of scopes this registry sources.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },

    // Common options across all actions
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before performing the action',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class RegistrySetMasterCommand extends Command {
  public static async create() {
    return new RegistrySetMasterCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    // Load parameters
    const [deploymentName, accountId, csvScopes] = input.arguments as string[];
    const region = input.options.region as string;
    const dryRun = input.options['dry-run'] as boolean | undefined;
    const confirm = input.options.confirm as boolean | undefined;

    const scopes = csvScopes.split(',');

    // Load services
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    const deploymentService = await DeploymentService.create(input);
    const opsDataContext = await opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    // Get the deployment and accounts (via the misnamed listAllSubscriptions)
    const deployment: IOpsDeployment = await deploymentService.getSingleDeployment(deploymentName, region);
    const accounts: IFusebitAccount[] = await deploymentService.listAllSubscriptions(deployment);

    process.env.DEPLOYMENT_KEY = deployment.deploymentName;

    const awsOpts = {
      region: deployment.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    };

    const s3Opts = { ...awsOpts };

    const dynamoOpts = {
      apiVersion: '2012-08-10',
      httpOptions: {
        timeout: 5000,
      },
      maxRetries: 3,
      ...awsOpts,
    };

    const global: IRegistryGlobalConfig = { params: { accountId, registryId: Constants.REGISTRY_DEFAULT }, scopes };

    // Set the global entry to the new value
    await new AwsRegistry(Constants.REGISTRY_GLOBAL, {}, s3Opts, dynamoOpts).globalConfigPut(global);

    // Update all of the current accounts to have the new value
    await Promise.all(
      accounts.map((account) =>
        (AwsRegistry.create(
          { accountId: account.id, registryId: Constants.REGISTRY_DEFAULT },
          {},
          s3Opts,
          dynamoOpts
        ) as AwsRegistry).globalConfigUpdate(global)
      )
    );

    await executeService.result('Completed', `Processed ${accounts.length} registries`);
    return 0;
  }
}
