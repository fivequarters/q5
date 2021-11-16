import * as AWS from 'aws-sdk';

import { IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { AwsCreds } from '@5qtrs/aws-config';
import { IAwsCredentials } from '@5qtrs/aws-cred';

import * as Constants from '@5qtrs/constants';

import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { DeploymentService } from './DeploymentService';

// ----------------
// Exported Classes
// ----------------

export class RegistryService {
  private executeService: ExecuteService;
  private deploymentService: DeploymentService;
  private credentials: IAwsCredentials;

  private constructor(
    executeService: ExecuteService,
    deploymentService: DeploymentService,
    credentials: IAwsCredentials
  ) {
    this.executeService = executeService;
    this.deploymentService = deploymentService;
    this.credentials = credentials;
  }

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    const deploymentService = await DeploymentService.create(input);
    const opsDataContext = await opsService.getOpsDataContextImpl();
    const awsConfig = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
    return new RegistryService(executeService, deploymentService, credentials);
  }

  public clearModules = async (deploymentName: string, region: string, prefix: string) => {
    // Get the deployment and accounts (via the misnamed listAllSubscriptions)
    const deployment: IOpsDeployment = await this.deploymentService.getSingleDeployment(deploymentName, region);

    const awsOpts = {
      region: deployment.region,
      accessKeyId: this.credentials.accessKeyId,
      secretAccessKey: this.credentials.secretAccessKey,
      sessionToken: this.credentials.sessionToken,
    };

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      ...awsOpts,
    });

    let nextToken: string | undefined;

    const filteredObjects: { Key: string }[] = [];

    await this.executeService.execute(
      {
        header: 'Filtering',
        message: `Filtering for compiled modules starting with ${Text.bold(prefix)}`,
        errorHeader: 'Error',
      },
      async () => {
        do {
          const result = await s3
            .listObjectsV2({
              Bucket: Constants.get_deployment_s3_bucket(deployment),
              Prefix: 'npm-module/',
              ContinuationToken: nextToken,
            })
            .promise();
          if (!result.Contents) {
            return;
          }
          result.Contents.filter((record) => record.Key?.match(new RegExp(`\/${prefix}`))).forEach((record) => {
            if (record.Key) {
              filteredObjects.push({
                Key: record.Key,
              });
            }
          });

          nextToken = result.IsTruncated ? result.NextContinuationToken : undefined;
        } while (nextToken);
      }
    );

    await this.executeService.execute(
      {
        header: 'Removing',
        message: `Removing ${filteredObjects.length} entries...`,
        errorHeader: 'Error',
      },
      async () => {
        const chunkSize = 500;
        const maxLength: number = filteredObjects.length;

        for (let i: number = 0; i < maxLength; i += chunkSize) {
          await s3
            .deleteObjects({
              Bucket: Constants.get_deployment_s3_bucket(deployment),
              Delete: { Objects: filteredObjects.slice(i, i + chunkSize), Quiet: true },
            })
            .promise();
        }
      }
    );

    await this.executeService.result('Completed', `Removed ${filteredObjects.length} entries`);
  };
}
