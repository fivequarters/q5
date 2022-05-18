import { IDataSource } from '@5qtrs/data';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { createRole, createInstanceProfile, detachRolePolicy } from './OpsRole';
import { createPolicy } from './OpsIamPolicy';
import * as Constants from '@5qtrs/constants';

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
    const awsConfig = await this.provider.getAwsConfigForMain();
    // Create an AWSLambdaFullAccess policy replacement; unspecialized, used to handle the deprecation of the
    // role in 01/2021.
    await createPolicy(
      awsConfig,
      this.config.lambdaExecutionRoleName,
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'cloudformation:DescribeChangeSet',
              'cloudformation:DescribeStackResources',
              'cloudformation:DescribeStacks',
              'cloudformation:GetTemplate',
              'cloudformation:ListStackResources',
              'cloudwatch:*',
              'cognito-identity:ListIdentityPools',
              'cognito-sync:GetCognitoEvents',
              'cognito-sync:SetCognitoEvents',
              'dynamodb:*',
              'ec2:DescribeSecurityGroups',
              'ec2:DescribeSubnets',
              'ec2:DescribeVpcs',
              'events:*',
              'iam:GetPolicy',
              'iam:GetPolicyVersion',
              'iam:GetRole',
              'iam:GetRolePolicy',
              'iam:ListAttachedRolePolicies',
              'iam:ListRolePolicies',
              'iam:ListRoles',
              'iam:PassRole',
              'iot:AttachPrincipalPolicy',
              'iot:AttachThingPrincipal',
              'iot:CreateKeysAndCertificate',
              'iot:CreatePolicy',
              'iot:CreateThing',
              'iot:CreateTopicRule',
              'iot:DescribeEndpoint',
              'iot:GetTopicRule',
              'iot:ListPolicies',
              'iot:ListThings',
              'iot:ListTopicRules',
              'iot:ReplaceTopicRule',
              'kinesis:DescribeStream',
              'kinesis:ListStreams',
              'kinesis:PutRecord',
              'kms:ListAliases',
              'lambda:*',
              'logs:*',
              's3:*',
              'sns:ListSubscriptions',
              'sns:ListSubscriptionsByTopic',
              'sns:ListTopics',
              'sns:Publish',
              'sns:Subscribe',
              'sns:Unsubscribe',
              'sqs:ListQueues',
              'sqs:SendMessage',
              'tag:GetResources',
              'xray:PutTelemetryRecords',
              'xray:PutTraceSegments',
            ],
            Resource: '*',
          },
        ],
      },
      'General purpose policy',
      this.config.iamPermissionsBoundary
    );

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
        `${this.config.arnPrefix}:iam::${awsConfig.account}:policy/${this.config.lambdaExecutionRoleName}`,
        `${this.config.arnPrefix}:iam::aws:policy/CloudWatchFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonS3ReadOnlyAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonRDSDataFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole`,
        `${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole`,
      ],
      undefined,
      undefined,
      this.config.iamPermissionsBoundary
    );

    // Clean-up deprecated roles when transiting 1.24.17.
    await detachRolePolicy(
      awsConfig,
      this.config.cronExecutorRoleName,
      `${this.config.arnPrefix}:iam::aws:policy/AWSLambdaFullAccess`
    );

    // Ensure IAM roles for Analytics are created

    await createRole(
      awsConfig,
      this.config.analyticsRoleName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonESFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole`,
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
        `${this.config.arnPrefix}:iam::aws:policy/AmazonRDSDataFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/CloudWatchLogsFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonDynamoDBFullAccess`,
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

    await createRole(
      awsConfig,
      this.config.functionPermissionlessRoleName,
      undefined,
      undefined,
      undefined,
      this.config.iamPermissionsBoundary
    );

    await createRole(
      awsConfig,
      this.config.backupRoleName,
      [
        'arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup',
        'arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores',
      ],
      undefined,
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'backup.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      this.config.iamPermissionsBoundary
    );

    // Ensure the instance profile and role for the VMs are created
    await createInstanceProfile(
      awsConfig,
      this.config.monoInstanceProfileName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/AmazonSQSFullAccess`,
        `${this.config.arnPrefix}:iam::${awsConfig.account}:policy/${this.config.lambdaExecutionRoleName}`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonS3FullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/CloudWatchAgentServerPolicy`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonDynamoDBFullAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/AmazonRDSDataFullAccess`,
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
          {
            Effect: 'Allow',
            Action: ['ssm:GetParameter*'],
            Resource: [
              `${this.config.arnPrefix}:ssm:*:${this.config.mainAccountId}:parameter${Constants.GRAFANA_CREDENTIALS_SSM_PATH}*`,
            ],
          },
        ],
      },
      this.config.iamPermissionsBoundary
    );

    await createInstanceProfile(
      awsConfig,
      this.config.monoGrafanaProfileName,
      [
        `${this.config.arnPrefix}:iam::aws:policy/AWSCloudMapRegisterInstanceAccess`,
        `${this.config.arnPrefix}:iam::aws:policy/CloudWatchFullAccess`,
      ],
      {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'MonitoringS3',
            Effect: 'Allow',
            Action: ['s3:ListBucket', 's3:PutObject', 's3:GetObject', 's3:DeleteObject'],
            Resource: [
              `${this.config.arnPrefix}:s3:::${this.config.getLokiBucketPrefix()}*`,
              `${this.config.arnPrefix}:s3:::${this.config.getLokiBucketPrefix()}*/*`,
              `${this.config.arnPrefix}:s3:::${this.config.getTempoBucketPrefix()}*`,
              `${this.config.arnPrefix}:s3:::${this.config.getTempoBucketPrefix()}*/*`,
              `${this.config.arnPrefix}:s3:::${this.config.getGrafanaBootstrapBucket()}*`,
              `${this.config.arnPrefix}:s3:::${this.config.getGrafanaBootstrapBucket()}*/*`,
            ],
          },
        ],
      },
      this.config.iamPermissionsBoundary
    );

    // Clean-up deprecated roles when transiting 1.24.17.
    await detachRolePolicy(
      awsConfig,
      this.config.monoInstanceProfileName,
      `${this.config.arnPrefix}:iam::aws:policy/AWSLambdaFullAccess`
    );
  }
}
