// This action can be retired once all stacks are above 1.17.6
import { AwsCreds } from '@5qtrs/aws-config';
import { ArgType, Command, IExecuteInput } from '@5qtrs/cli';
import { IFusebitAccount, IFusebitSubscriptionDetails } from '@5qtrs/ops-data';
import { ExecuteService } from '../../services/ExecuteService';
import { OpsService } from '../../services/OpsService';

import { unzip } from '@5qtrs/gzip';

import RDS from '@5qtrs/db';

import * as Constants from '@5qtrs/constants';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Migrate storage from DynamoDB to RDS',
  cmd: 'migrateStorage',
  summary: 'Migrate DynamoDB Storage into RDS',
  arguments: [
    {
      name: 'deployment',
      description: 'The deployment to migrate.',
    },
  ],
  options: [
    {
      name: 'region',
      description: 'The region of the deployment; required if the network is not globally unique',
      defaultText: 'network region',
    },
    {
      name: 'dry-run',
      aliases: ['n'],
      description: 'Evaluate an action without making any changes.',
      type: ArgType.boolean,
      default: 'false',
    },
    {
      name: 'batch',
      aliases: ['b'],
      description:
        'Maximum batch size to send transactions in.  If 413 errors occur, decrease this value and try again.',
      type: ArgType.integer,
      defaultText: '500',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class MigrateStorageActionCommand extends Command {
  public static async create() {
    return new MigrateStorageActionCommand();
  }

  private constructor() {
    super(command);
  }

  protected chunkArray(myArray: any[], chunkSize: number) {
    let index = 0;
    const arrayLength = myArray.length;
    const tempArray = [];

    for (index = 0; index < arrayLength; index += chunkSize) {
      const myChunk = myArray.slice(index, index + chunkSize);
      tempArray.push(myChunk);
    }

    return tempArray;
  }

  protected async itemToRecord(e: any) {
    const [accountId, subscriptionId] = e.accountIdSubscriptionId.S.split(':');
    const entityId = e.storageId.S;
    const data = e.gzip.BOOL ? await unzip(e.data.S) : e.data.S;

    return {
      entityType: 'storage',
      accountId,
      subscriptionId,
      entityId,
      data: JSON.stringify({ data }),
      tags: '{}',
    };
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    const executeService = await ExecuteService.create(input);

    const [deploymentName] = input.arguments as string[];
    const region = input.options.region as string;
    const dryRun = input.options['dry-run'] as boolean | undefined;
    const maxBatchSize = (input.options.batch as number) || 500;

    // Get the deployment
    const opsService = await OpsService.create(input);
    const opsDataContext = await opsService.getOpsDataContextImpl();
    const deploymentData = opsDataContext.deploymentData;
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

    let deployment: any;

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

    const AWS = require('aws-sdk');
    AWS.config.update({ region: deployment.region });
    AWS.config.credentials = credentials;
    process.env.DEPLOYMENT_KEY = deployment.deploymentName;

    const dynamo = new AWS.DynamoDB({
      apiVersion: '2012-08-10',
      httpOptions: {
        timeout: 5000,
      },
      maxRetries: 3,
    });

    let dst!: any;
    let batches!: any;

    await executeService.execute(
      {
        header: 'Scan DynamoDB',
        message: `Scanning ${deployment.deploymentName}.storage table...`,
        errorHeader: 'Scan Error',
      },
      async () => {
        // Pull from the storage DynamoDB table.
        const scanResult: any[] = await Constants.dynamoScanTable(dynamo, {
          TableName: `${deployment.deploymentName}.storage`,
        });

        dst = await Promise.all(scanResult.map(this.itemToRecord));

        batches = this.chunkArray(dst, maxBatchSize);
      }
    );

    await executeService.result('Scan Completed', `Identified ${dst.length} entries across ${batches.length} batches`);

    if (dryRun) {
      executeService.result('Dry Run', `Completed.`);
      return 0;
    }

    // Write to the destination RDS Database.
    const INSERT = `
      INSERT INTO entity
          (entityType, accountId, subscriptionId, entityId, version, data, tags)
        VALUES (:entityType::entity_type, :accountId, :subscriptionId,
          :entityId, gen_random_uuid(), :data::jsonb, :tags::jsonb)
          ON CONFLICT DO NOTHING
          RETURNING 1`;

    let successes: number = 0;
    let failures: number = 0;
    await executeService.execute(
      {
        header: 'Loading RDS',
        message: `Inserting ${dst.length} records into the 'fusebit.entry' table...`,
        errorHeader: 'Insert Error',
      },
      async () => {
        try {
          const result = await Promise.all(batches.map((batch: any) => RDS.executeBatchStatement(INSERT, batch)));
          result.forEach((batch: any) =>
            batch.updateResults.forEach((e: any) => {
              if (e.generatedFields.length) {
                successes++;
              } else {
                failures++;
              }
            })
          );
        } catch (err) {
          if (err.code === 'MultipleValidationErrors') {
            throw new Error(
              [
                `Re-run with FUSEBIT_DEBUG=1 to observe the parameter array.\n\nShowing the first 10 errors...`,
                err.message.split('\n').slice(0, 10).join('\n'),
              ].join('\n')
            );
          }
          throw err;
        }
      }
    );
    executeService.result(
      'Data Inserted',
      `The operation successfully inserted ${successes} rows and ignored ${failures} records due to duplication.`
    );

    return 0;
  }
}
