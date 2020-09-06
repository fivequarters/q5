import { AwsCreds } from '@5qtrs/aws-config';
import { ArgType, Command, IExecuteInput } from '@5qtrs/cli';
import { IFusebitAccount, IFusebitSubscriptionDetails } from '@5qtrs/ops-data';
import { ExecuteService } from '../../services/ExecuteService';
import { OpsService } from '../../services/OpsService';

import * as Constants from '@5qtrs/constants';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Regenerate Tags',
  cmd: 'regenTags',
  summary: 'Regenerate tags for functions',
  description:
    'Regenerate all of the tags for the functions in a given deployment from their base specifications.  This script is necessary if functions known to exist do not show up in `fuse function ls`, or if the tag specification changes as the result of an upgrade.',
  arguments: [
    {
      name: 'deployment',
      description: 'The deployment to regenerate the tags.',
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
      name: 'dry-run',
      aliases: ['n'],
      description: 'Evaluate an action without making any changes.',
      type: ArgType.boolean,
      default: 'false',
    },
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

export class RegenerateTagsActionCommand extends Command {
  public static async create() {
    return new RegenerateTagsActionCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const executeService = await ExecuteService.create(input);

    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string;
    const dryRun = input.options['dry-run'] as boolean | undefined;
    const confirm = input.options.confirm as boolean | undefined;

    let token: string | undefined;
    let len;
    let cnt = 0;
    let cntFailed = 0;

    // Get the deployment
    const opsService = await OpsService.create(input);
    const opsDataContext = await opsService.getOpsDataContextImpl();
    const deploymentData = opsDataContext.deploymentData;
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    let deployment;

    if (!region) {
      const deployments = await deploymentData.listAll(deploymentName);
      if (deployments.length === 0) {
        // Error on deployment not found.
        await executeService.warning('Deployment Not Found', `Deployment ${deploymentName} not found`);
        return 1;
      } else if (deployments.length > 1) {
        // Error on required region.
        await executeService.warning(
          'Ambiguous Deployments',
          `Multiple deployments named '${deploymentName}' found, select the region desired: ${deployments.map(
            (d) => d.region
          )}`
        );
        return 1;
      }
      deployment = deployments[0];
    } else {
      deployment = await deploymentData.get(deploymentName, region);
      if (!deployment) {
        await executeService.warning('Deployment Not Found', `Deployment ${deploymentName} not found in ${region}`);
        return 1;
      }
    }

    // Get the subscriptions to fill in missing data
    const subscriptions = await deploymentData.listAllSubscriptions(deployment);
    const subToAccount: { [subId: string]: string } = {};
    subscriptions.forEach((account: IFusebitAccount) =>
      account.subscriptions.forEach((s: IFusebitSubscriptionDetails) => {
        subToAccount[s.id] = account.id;
      })
    );

    await executeService.info('Setup', `Loaded information for ${subscriptions.length} subscriptions`);

    // Load in some defaults to make sure the tag code works correctly.
    const AWS = require('aws-sdk');
    AWS.config.update({ region: deployment.region });
    process.env.DEPLOYMENT_KEY = deployment.deploymentName;

    // Establish the S3 context
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: deployment.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      params: {
        Bucket: Constants.get_deployment_s3_bucket(deployment),
      },
    });

    const dynamo = new AWS.DynamoDB({
      apiVersion: '2012-08-10',
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      httpOptions: {
        timeout: 5000,
      },
      maxRetries: 3,
    });

    // Load tags once the AWS configuration has been set correctly.
    const Tags = require('@5qtrs/function-tags');

    const getSpec = async (file: string): Promise<any> => {
      const params = { Key: file };
      const response = await s3.getObject(params).promise();

      return JSON.parse(response.Body as string);
    };

    const createTags = async (subs: { [subId: string]: string }, file: string) => {
      const spec = await getSpec(file);
      if (!spec.accountId) {
        spec.accountId = subs[spec.subscriptionId] || 'acc-0000000000000000';
      }

      if (dryRun) {
        await executeService.info(
          'Action',
          `Rebuilding function:\n${spec.accountId}.${spec.subscriptionId}\n${spec.boundaryId}.${spec.functionId}`
        );
        return;
      }

      const e = await new Promise((resolve, reject) => {
        Tags.create_function_tags({ ...spec, dynamo }, spec, resolve);
      });
      if (e) {
        await executeService.warning(
          'Failed',
          `Tag generation for function ${spec.accountId}.${spec.subscriptionId}.${spec.boundaryId}.${spec.functionId} encountered an error: ${e}\nRetry command or rebuild the function.`
        );
        cntFailed++;
      }
    };

    const listSpecs = async (
      subs: { [subId: string]: string },
      nextToken: string | undefined
    ): Promise<[number, string | undefined]> => {
      const params = {
        Prefix: 'function-spec',
        ContinuationToken: nextToken,
      };
      const response = await s3.listObjectsV2(params).promise();

      if (response.Contents) {
        await executeService.info('In Progress', `Processing batch of ${response.Contents.length} functions`);
        await Promise.all(response.Contents.map((obj: any) => createTags(subs, obj.Key)));
        return [response.Contents.length, response.NextContinuationToken];
      }

      return [0, undefined];
    };

    await executeService.info('In Progress', `Acquiring function specifications`);

    // Iterate over the functions and regenerate their tags
    do {
      [len, token] = await listSpecs(subToAccount, token);
      cnt += len;
      if (!token) {
        break;
      }
    } while (true);

    await executeService.result('Completed', `Processed ${cnt - cntFailed}/${cnt} functions`);

    return 0;
  }
}
