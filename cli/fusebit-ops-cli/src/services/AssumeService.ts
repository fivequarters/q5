import AWS from 'aws-sdk';
import open from 'open';

import { IExecuteInput } from '@5qtrs/cli';
import { Text } from '@5qtrs/text';
import { AwsCreds } from '@5qtrs/aws-config';
import { AccountDataAwsContextFactory } from '@5qtrs/account-data-aws';

import { IOpsDeployment } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '@5qtrs/ops-data-aws';

import { AwsKeyStore } from '@5qtrs/runas';
import * as Constants from '@5qtrs/constants';

import { ExecuteService } from './ExecuteService';
import { OpsService } from './OpsService';

interface IManageOpenOptions {
  hostname: string;
  path: string;
}

interface IAuthBundle {
  jwt: string;
  accountId: string;
  subscriptionId: string;
  userId: string;
}

export class AssumeService {
  protected input: IExecuteInput;
  private executeService: ExecuteService;
  private opsService: OpsService;

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    const executeService = await ExecuteService.create(input);
    return new AssumeService(input, opsService, executeService);
  }

  private constructor(input: IExecuteInput, opsService: OpsService, executeService: ExecuteService) {
    this.input = input;
    this.opsService = opsService;
    this.executeService = executeService;
  }

  public async createKeyStore(deployment: IOpsDeployment): Promise<AwsKeyStore> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForDeployment(
      deployment.deploymentName,
      deployment.region
    );
    const credentials = await (config.creds as AwsCreds).getCredentials();

    const dynamo = new AWS.DynamoDB({
      region: deployment.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      apiVersion: '2012-08-10',
    });

    return new AwsKeyStore({
      dynamo,
      deployment: deployment.deploymentName,
      audience: `https://${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`,
    });
  }

  public async getFirstUser(deployment: IOpsDeployment, accountId: string): Promise<string> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForDeployment(
      deployment.deploymentName,
      deployment.region
    );
    const awsConfig = await OpsDataAwsConfig.create(opsDataContext.config);
    const accountDataFactory = await AccountDataAwsContextFactory.create(config);
    const accountData = await accountDataFactory.create(awsConfig);
    const userList = await accountData.userData.list(accountId);

    const userId = userList.items[0]?.id;

    if (!userId) {
      this.executeService.error(
        'No User Found',
        Text.create(
          `No users found in account ${accountId} on ${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`
        )
      );

      throw new Error(
        `No users found in account ${accountId} on ${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`
      );
    }

    return userId;
  }

  public makeToken(accountId: string, subscriptionId: string, userId?: string) {
    return {
      sub: `uri:assume:${accountId}:${subscriptionId}`,
      [Constants.JWT_PERMISSION_CLAIM]: {
        allow: [{ action: '*', resource: `/account/${accountId}/` }],
      },
      [Constants.JWT_PROFILE_CLAIM]: {
        accountId,
        subscriptionId,
        userId,

        // Include a @fusebit.io email to prevent customer analytics from tracking
        email: 'assumed+role@fusebit.io',
      },
    };
  }

  // Create a token that's good for everything; should not be printed, logged, or otherwise exposed outside of
  // HTTP auth requests.
  public makeMasterToken() {
    return {
      sub: `uri:assume:master`,
      [Constants.JWT_PERMISSION_CLAIM]: {
        allow: [{ action: '*', resource: `/` }],
      },
    };
  }

  public async createAuthBundle(
    deployment: IOpsDeployment,
    accountId: string,
    subscriptionId: string,
    userId?: string
  ): Promise<IAuthBundle> {
    const keyStore = await this.createKeyStore(deployment);
    await keyStore.rekey();

    if (!userId) {
      userId = await this.getFirstUser(deployment, accountId);
    }

    const jwt = await keyStore.signJwt(this.makeToken(accountId, subscriptionId, userId));
    keyStore.shutdown();

    return { jwt, accountId, subscriptionId, userId };
  }

  public async createMasterAuthBundle(deployment: IOpsDeployment): Promise<{ jwt: string }> {
    const keyStore = await this.createKeyStore(deployment);
    await keyStore.rekey();

    const jwt = await keyStore.signJwt(this.makeMasterToken());
    keyStore.shutdown();

    return { jwt };
  }

  public makeUrl(options: IManageOpenOptions, authBundle: IAuthBundle) {
    return `${options.hostname}${options.path}#access_token=${authBundle.jwt}&scope=openid%20profile%20email&expires_in=86400&token_type=Bearer`;
  }

  public async openManage(options: IManageOpenOptions, deployment: IOpsDeployment, authBundle: IAuthBundle) {
    this.executeService.result(
      'Opening Browser',
      Text.create(
        `Opening browser for account ${authBundle.accountId} as ${authBundle.userId} on ${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`
      )
    );

    const url = this.makeUrl(options, authBundle);

    open(url);
  }
}
