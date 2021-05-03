import AWS, { Config } from 'aws-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { AwsCreds } from '@5qtrs/aws-config';

export class BackupService {
  private opsService: OpsService;
  private executeService: ExecuteService;
  private input: IExecuteInput;
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    return new BackupService(opsSvc, execSvc, input);
  }

  private constructor(opsSvc: OpsService, execSvc: ExecuteService, input: IExecuteInput) {
    this.opsService = opsSvc;
    this.executeService = execSvc;
    this.input = input;
  }

  // the code that gets a backup plan from AWS Backup, triggered by GetBackupCommand.ts
  public async getBackupPlan(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;
    const info = await this.executeService.execute(
      {
        header: 'Get Backup Plan',
        message: `Get the information of the ${backupPlanName} backup plan`,
        errorHeader: 'Backup plan error',
      },
      () => this.getBackupPlanDriver(backupPlanName)
    );
    return info;
  }

  // the code that gets all protected tables from AWS Backup, triggered by ListBackupProtectedResource.ts
  public async listBackupProtectedTable(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;
    const info = await this.executeService.execute(
      {
        header: 'List Backup Protected Table',
        message: 'List the backup plan protected tables',
        errorHeader: 'List Backup Plan protected resource failed',
      },
      () => this.listBackupProtectedTableDriver(backupPlanName)
    );
    return info;
  }

  // the actual backend driver for listBackupProtectedTable, triggered by listBackupProtectedTable()
  public async listBackupProtectedTableDriver(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const userCreds = await this.opsService.getUserCredsForProfile(profile);
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const regions = await this.findAllRegionsWithDeployments(credentials, config);
    for (const region of regions) {
      const Backup = new AWS.Backup({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        region,
      });
      await Backup.listRecoveryPointsByBackupVault({
        BackupVaultName: backupPlanName,
      })
        .promise()
        .then((data) => {
          console.log(data);
        });
    }
  }

  // the actual backend driver for get backup plan, triggered by getBackupPlan
  public async getBackupPlanDriver(backupPlanName: string): Promise<any> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const userCreds = await this.opsService.getUserCredsForProfile(profile);
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const results = await this.findRegionWithDeployment(credentials, config, backupPlanName);
    return new Promise((res, rej) => {
      res(results);
    });
  }

  // the code that creates a backup plan from AWS Backup, triggered by ScheduleBackupCommand.ts
  public async createBackupPlan(backupPlanName: string, backupPlanSchedule: string, failureSnsTopicArn?: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;
    const info = await this.executeService.execute(
      {
        header: 'Creating Backup Plan',
        message: 'creating the backup plan in every region where the Fusebit platform is deployed',
        errorHeader: 'Creation of Backup Plans Failed',
      },
      () => this.createBackupPlanDriver(backupPlanName, backupPlanSchedule, failureSnsTopicArn)
    );
    return info;
  }

  // the actual backend driver for creating backup plan, triggered by createBackupPlan
  private async createBackupPlanDriver(
    backupPlanName: string,
    backupPlanSchedule: string,
    failureSnsTopicArn?: string
  ) {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const regions = await this.findAllRegionsWithDeployments(credentials, config);
    for (const region of regions) {
      const Backup = new AWS.Backup({
        region,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      });
      await Backup.createBackupVault({
        BackupVaultName: backupPlanName,
        BackupVaultTags: {
          account: config.account,
          region,
        },
      })
        .promise()
        .catch((err) => {});
      await Backup.createBackupPlan({
        BackupPlan: {
          BackupPlanName: backupPlanName,
          Rules: [
            {
              RuleName: 'FusebitBackupPlan',
              TargetBackupVaultName: backupPlanName,
              ScheduleExpression: `cron(${backupPlanSchedule})`,
            },
          ],
        },
        BackupPlanTags: {
          account: config.account,
          region,
        },
      })
        .promise()
        .then(async (data) => {
          await Backup.createBackupSelection({
            BackupPlanId: data.BackupPlanId as string,
            BackupSelection: {
              IamRoleArn: `arn:aws:iam::${config.account}:role/fusebit-backup-role`,
              SelectionName: 'DynamoDB',
              ListOfTags: [
                {
                  ConditionKey: 'account',
                  ConditionType: 'STRINGEQUALS',
                  ConditionValue: config.account,
                },
              ],
            },
          }).promise();
          if (failureSnsTopicArn) {
            await Backup.putBackupVaultNotifications({
              BackupVaultName: backupPlanName,
              BackupVaultEvents: ['BACKUP_JOB_COMPLETED'],
              SNSTopicArn: failureSnsTopicArn,
            })
              .promise()
              .then(() => {});
          }
        })
        .catch((err) => {
          throw Error(err);
        });
    }
  }

  // deletes a backup plan from AWS Backup, triggered by DeleteBackupCommand.ts
  public async deleteBackupPlan(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;
    const info = this.executeService.execute(
      {
        header: 'deleting Backup Plans',
        message: `deleting backup plans ${backupPlanName}`,
        errorHeader: `something went wrong during deletion`,
      },
      () => this.deleteBackupPlanDriver(backupPlanName)
    );
    return info;
  }

  // the actual driver for delete Backup plan, deletes backup plan from AWS Backup, triggered by deleteBackupPlan()
  private async deleteBackupPlanDriver(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const regions = await this.findAllRegionsWithDeployments(credentials, config);
    for (const region of regions) {
      const BackupPlanIdIfExists = await this.getBackupIdByName(credentials, config, region, backupPlanName);
      if (BackupPlanIdIfExists === undefined) {
        continue;
      } else {
        const Backup = new AWS.Backup({
          region,
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        });
        await Backup.listBackupSelections({
          BackupPlanId: BackupPlanIdIfExists as string,
        })
          .promise()
          .then(async (data) => {
            for (const i of data.BackupSelectionsList as AWS.Backup.BackupSelectionsList) {
              await Backup.deleteBackupSelection({
                BackupPlanId: BackupPlanIdIfExists as string,
                SelectionId: i.SelectionId as string,
              }).promise();
            }
          });
        await Backup.deleteBackupSelection({
          BackupPlanId: BackupPlanIdIfExists as string,
          SelectionId: 'DynamoDB',
        });
        await Backup.deleteBackupPlan({
          BackupPlanId: BackupPlanIdIfExists as string,
        }).promise();
        await Backup.deleteBackupVault({
          BackupVaultName: backupPlanName as string,
        })
          .promise()
          .catch((err) => {});
      }
    }
  }

  // helper function, get backup plan id by the friendly name of the backup plan
  private async getBackupIdByName(credentials: any, config: any, region: string, BackupName: string): Promise<string> {
    const backup = new AWS.Backup({
      region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });
    let result: string | undefined;
    await backup
      .listBackupPlans()
      .promise()
      .then((data) => {
        for (const i of data.BackupPlansList as AWS.Backup.BackupPlansList) {
          if (i.BackupPlanName === BackupName) {
            result = i.BackupPlanId;
          }
        }
      });
    return new Promise((res, _) => res(result as string));
  }

  // list backup plans available in all AWS regions, triggered by GetBackupCommand.ts
  public async listBackupPlan(): Promise<any> {
    const region = this.input.options.region as string;
    const listing = await this.executeService.execute(
      {
        header: 'List Backup Plans',
        message: `Listing backup plans`,
        errorHeader: 'Backup Listing Error',
      },
      () => this.listBackupPlanDriver()
    );
    return listing;
  }

  // the actual driver for backup plan, trigged by listBackupPlan()
  private async listBackupPlanDriver() {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const userCreds = await this.opsService.getUserCredsForProfile(profile);
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();

    const regions = await this.findAllRegionsWithDeployments(credentials, config);
    const backupPlans: any = { BackupPlansList: [] };
    for (const i of regions) {
      const Backup = new AWS.Backup({
        region: i,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      });
      await Backup.listBackupPlans({})
        .promise()
        .then((data) => {
          backupPlans.BackupPlansList = [
            ...(data.BackupPlansList as AWS.Backup.BackupPlansList),
            ...backupPlans.BackupPlansList,
          ];
        });
    }
    return new Promise((res, _) => {
      res(backupPlans);
    });
  }

  // display driver for showing backup plans
  public async displayBackupPlans(data: any) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(await this.sanitizeBackupPlans(data), null, 2));
    } else if (this.input.options.output === 'pretty') {
      this.input.io.writeLine('not implemented');
    }
  }

  // sanitize the backup plans result from listBackupPlan()
  public sanitizeBackupPlans(data: any) {
    if (!data) {
      return { backups: [] };
    }
    if (!data.BackupPlansList) {
      return { backups: [] };
    }
    return { Backup: data.BackupPlansList.map((item: any) => item.BackupPlanId) };
  }

  // helper function: find all regions that have deployments and the region of ops tables
  public async findAllRegionsWithDeployments(credentials: any, config: any): Promise<string[]> {
    const region: string[] = [];
    const ddb = new AWS.DynamoDB({
      region: config.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      apiVersion: '2012-08-10',
    });
    const scanParams = {
      TableName: 'ops.stack',
    };
    await ddb
      .scan(scanParams)
      .promise()
      .then(async (data) => {
        if (!data) {
          throw Error('can not find ops.stack table');
        }
        if (!data.Items) {
          throw Error("can't find items in ops.stack table");
        }

        if ((data.Items?.length as number) === 0) {
          throw new Error('no deployment found');
        }
        for (const i of data.Items) {
          if (!region.includes((i.regionStackId.S as string).split('::')[0] as string)) {
            region.push((i.regionStackId.S as string).split('::')[0]);
          }
        }
      });
    if (!region.includes(config.region)) {
      region.push(config.region);
    }
    return new Promise((res, rej) => {
      res(region);
    });
  }

  // find the region of the specified deployment
  public async findRegionWithDeployment(credentials: any, config: any, backupId: string) {
    const regions = await this.findAllRegionsWithDeployments(credentials, config);
    let result;
    for (const i of regions) {
      const Backup = new AWS.Backup({
        region: i,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      });
      await Backup.getBackupPlan({
        BackupPlanId: backupId,
      })
        .promise()
        .then((data) => {
          result = data;
        })
        .catch((err) => {});
    }
    return result;
  }

  // display driver for getting specific backup plan
  public async displayGetBackupPlans(backupPlan: any) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLine(JSON.stringify(await this.sanitizeGetBackupPlans(backupPlan), null, 2));
    } else if (this.input.options.output === 'pretty') {
      this.input.io.writeLine('not implemented');
    }
  }

  // sanitize the result of getBackupPlan for the display driver
  private async sanitizeGetBackupPlans(backupPlan: any) {
    if (!backupPlan) {
      return {};
    }
    return {
      BackupPlan: backupPlan.BackupPlan.BackupPlanName,
      Rules: [...backupPlan.BackupPlan.Rules],
    };
  }
}
