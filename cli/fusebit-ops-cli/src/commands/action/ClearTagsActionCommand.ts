// This action can be retired once all stacks are above 1.17.6
import { AwsCreds } from '@5qtrs/aws-config';
import { ArgType, Command, IExecuteInput } from '@5qtrs/cli';
import { IFusebitAccount, IFusebitSubscriptionDetails } from '@5qtrs/ops-data';
import { ExecuteService } from '../../services/ExecuteService';
import { OpsService } from '../../services/OpsService';

import * as Constants from '@5qtrs/constants';

export const TAG_CATEGORY_BOUNDARY = 'function-tags-boundary';
export const TAG_CATEGORY_SUBSCRIPTION = 'function-tags-subscription';

const DYNAMO_BATCH_ITEMS_MAX = 25;
const DYNAMO_BACKOFF_TRIES_MAX = 5;
const DYNAMO_BACKOFF_DELAY = 300;
const expBackoff = (c: number) => Math.pow(2, c - 1) * DYNAMO_BACKOFF_DELAY;

function scan_dynamo_old_categories(
  options: any,
  cb: any,
  results: any[] = [],
  lastEvaluatedKey?: string,
  backoff = 0
) {
  setTimeout(
    () => {
      const params = {
        TableName: options.keyValueTableName,
        ProjectionExpression: 'category, #k',
        ExpressionAttributeNames: { '#k': 'key' },
        ExpressionAttributeValues: {
          ':c1': { S: TAG_CATEGORY_BOUNDARY },
          ':c2': { S: TAG_CATEGORY_SUBSCRIPTION },
        },
        ExclusiveStartKey: lastEvaluatedKey,
        FilterExpression: 'category = :c1 OR category = :c2',
      };

      return options.dynamo.scan(params, (e: any, d: any) => {
        if (e) {
          if (e.retryable) {
            // Some entries didn't get processed; try again (and save the overflow).
            if (backoff > DYNAMO_BACKOFF_TRIES_MAX) {
              return cb('Unable to scan tags, exhausted allowed attempts');
            }
            return scan_dynamo_old_categories(options, cb, results, lastEvaluatedKey, backoff + 1);
          }

          return cb(e);
        }

        // Collect the items found for future deletion.
        d.Items.forEach((t: any) => results.push([t.category.S, t.key.S]));

        // Continue scanning and accumulating results.
        if (d.LastEvaluatedKey) {
          return scan_dynamo_old_categories(options, cb, results, d.LastEvaluatedKey, backoff);
        }

        // Scan completed, return results.
        return cb(null, results);
      });
    },
    backoff > 0 ? expBackoff(backoff) : 0
  );
}

function get_dynamo_delete_request(category: string, key: string) {
  return [
    {
      DeleteRequest: {
        Key: {
          category: {
            S: category,
          },
          key: {
            S: key,
          },
        },
      },
    },
  ];
}

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Clear Old Tags',
  cmd: 'clearTags',
  summary: 'Clear old function tags (<1.17.6)',
  description: 'Remove any old tags from the deployment.',
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

export class ClearTagsActionCommand extends Command {
  public static async create() {
    return new ClearTagsActionCommand();
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

    // Load in some defaults to make sure the tag code works correctly.
    const AWS = require('aws-sdk');
    AWS.config.update({ region: deployment.region });
    process.env.DEPLOYMENT_KEY = deployment.deploymentName;

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

    const dynOptions = { keyValueTableName: Tags.Constants.keyValueTableName, dynamo };

    const scanResult: any[] = await new Promise((resolve, reject) => {
      scan_dynamo_old_categories(dynOptions, (e: any, d: any) => {
        if (e) {
          return reject(e);
        } else {
          return resolve(d);
        }
      });
    });

    if (dryRun) {
      await executeService.result('Completed', `Identified ${scanResult.length} old entries`);
      return 0;
    }

    const request: any[] = [];

    scanResult.forEach((e) => request.push(...get_dynamo_delete_request(e[0], e[1])));

    await new Promise((resolve, reject) => {
      Tags.Dynamo.execute_dynamo_batch_write(dynOptions, request, (e: any, d: any) => {
        if (e) {
          return reject(e);
        } else {
          return resolve(d);
        }
      });
    });

    await executeService.result('Completed', `Cleared ${scanResult.length} old entries`);

    return 0;
  }
}
