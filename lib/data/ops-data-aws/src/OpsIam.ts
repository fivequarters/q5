import { IDataSource } from '@5qtrs/data';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { createRole, createInstanceProfile } from './OpsRole';

// ----------------
// Exported Classes
// ----------------

export class OpsIam implements IDataSource {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    return new OpsIam(config, provider);
  }

  private constructor(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    this.config = config;
    this.provider = provider;
  }

  private config: OpsDataAwsConfig;
  private provider: OpsDataAwsProvider;

  public async isSetup(): Promise<boolean> {
    return false; // TODO optimize detection of pre-existing IAM setup
  }

  public async setup(): Promise<void> {
    let awsConfig = await this.provider.getAwsConfigForMain();

    // Ensure IAM roles for DWH export are created

    await createRole(
      awsConfig,
      this.config.dwhExportRoleName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/AmazonDynamoDBReadOnlyAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonS3ReadOnlyAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`,
      ],
      undefined,
      undefined,
      this.config.iamPermissionsBoundary
    );

    // Ensure IAM roles for CRON are created

    await createRole(
      awsConfig,
      this.config.cronExecutorRoleName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/AWSLambdaFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/CloudWatchFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonS3ReadOnlyAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole`,
      ],
      undefined,
      undefined,
      this.config.iamPermissionsBoundary
    );

    // Ensure IAM roles for Analytics are created

    await createRole(
      awsConfig,
      this.config.analyticsRoleName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonESFullAccess`,
      ],
      undefined,
      undefined,
      this.config.iamPermissionsBoundary
    );

    await createRole(
      awsConfig,
      this.config.cronSchedulerRoleName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/AmazonSQSFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonS3FullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/CloudWatchLogsFullAccess`,
      ],
      undefined,
      undefined,
      this.config.iamPermissionsBoundary
    );

    // Ensure IAM roles for builder and user functions are created

    await createRole(
      awsConfig,
      this.config.builderRoleName,
      [`${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`],
      undefined,
      undefined,
      this.config.iamPermissionsBoundary
    );

    await createRole(
      awsConfig,
      this.config.functionRoleName,
      undefined,
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['ec2:CreateNetworkInterface', 'ec2:DeleteNetworkInterface', 'ec2:DescribeNetworkInterfaces'],
            Resource: '*',
          },
        ],
      },
      undefined,
      this.config.iamPermissionsBoundary
    );

    // Ensure the instance profile and role for the VMs are created

    await createInstanceProfile(
      awsConfig,
      this.config.monoInstanceProfileName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/AmazonSQSFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AWSLambdaFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonS3FullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/CloudWatchAgentServerPolicy`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonDynamoDBFullAccess`,
      ],
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'],
            Resource: `${this.config.arnPrefix}:ecr:${this.config.mainRegion}:${this.config.mainAccountId}:repository/${this.config.monoRepoName}`,
          },
          {
            Effect: 'Allow',
            Action: ['ecr:GetAuthorizationToken'],
            Resource: '*',
          },
        ],
      },
      this.config.iamPermissionsBoundary
    );
  }
}
