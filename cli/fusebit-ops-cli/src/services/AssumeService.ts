import AWS from 'aws-sdk';
import open from 'open';

import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { AwsCreds } from '@5qtrs/aws-config';
import { AccountDataAwsContextFactory } from '@5qtrs/account-data-aws';

import { IOpsDeployment } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '@5qtrs/ops-data-aws';

import { AwsKeyStore } from '@5qtrs/runas';
import * as Constants from '@5qtrs/constants';

interface IManageOpenOptions {
  hostname: string;
  path: string;
}

export class AssumeService {
  protected input: IExecuteInput;
  private opsService: OpsService;

  public static async create(input: IExecuteInput) {
    const opsService = await OpsService.create(input);
    return new AssumeService(input, opsService);
  }

  private constructor(input: IExecuteInput, opsService: OpsService) {
    this.input = input;
    this.opsService = opsService;
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

  public async getValidUser(deployment: IOpsDeployment, accountId: string, userId?: string): Promise<string> {
    if (userId) {
      return userId;
    }

    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForDeployment(
      deployment.deploymentName,
      deployment.region
    );
    const awsConfig = await OpsDataAwsConfig.create(opsDataContext.config);
    const accountDataFactory = await AccountDataAwsContextFactory.create(config);
    const accountData = await accountDataFactory.create(awsConfig);

    userId = (await accountData.userData.list(accountId)).items[0].id;

    if (!userId) {
      throw new Error(`No users found in account ${accountId}`);
    }

    return userId;
  }

  public makeToken(accountId: string, subscriptionId: string, userId?: string) {
    const payload: { [key: string]: any } = {
      sub: `uri:assume:${accountId}:${subscriptionId}`,
    };

    payload[Constants.JWT_PERMISSION_CLAIM] = {
      allow: [{ action: '*', resource: `/account/${accountId}/subscription/${subscriptionId}` }],
    };

    payload[Constants.JWT_PROFILE_CLAIM] = {
      accountId,
      subscriptionId,
      userId,
    };

    return payload;
  }

  public async createJwt(deployment: IOpsDeployment, accountId: string, subscriptionId: string, userId?: string) {
    const keyStore = await this.createKeyStore(deployment);
    await keyStore.rekey();

    userId = await this.getValidUser(deployment, accountId, userId);

    const jwt = await keyStore.signJwt(this.makeToken(accountId, subscriptionId, userId));
    keyStore.shutdown();

    return { jwt, accountId, subscriptionId, userId };
  }

  public openManage(options: IManageOpenOptions, jwt: string) {
    const url = `${options.hostname}${options.path}#access_token=${jwt}&scope=openid%20profile%20email&expires_in=86400&token_type=Bearer`;

    open(url);
  }
}
