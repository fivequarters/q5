import AWS, { Config } from 'aws-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { AwsCreds, IAwsConfig } from '@5qtrs/aws-config';
import { IAwsCredentials } from '@5qtrs/aws-cred';

export class BackupService {
  private opsService: OpsService;
  private executeService: ExecuteService;
  private input: IExecuteInput;
  private config: IAwsConfig;
  private credentials: IAwsCredentials;
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    return new BackupService(opsSvc, execSvc, config, credentials, input);
  }

  private constructor(
    opsSvc: OpsService,
    execSvc: ExecuteService,
    config: IAwsConfig,
    credentials: IAwsCredentials,
    input: IExecuteInput
  ) {
    this.opsService = opsSvc;
    this.executeService = execSvc;
    this.config = config;
    this.credentials = credentials;
    this.input = input;
  }

  // Get AWS Backup
  private async getAwsBackupClient(region: string) {
    return new AWS.Backup({
      accessKeyId: this.credentials.accessKeyId,
      secretAccessKey: this.credentials.secretAccessKey,
      sessionToken: this.credentials.sessionToken,
      region
    })
  }

  // the code that gets a backup plan from AWS Backup, triggered by GetBackupCommand.ts
  public async getBackupPlan(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
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

  // the actual backend driver for get backup plan, triggered by getBackupPlan
  public async getBackupPlanDriver(backupPlanName: string): Promise<AWS.Backup.GetBackupPlanOutput | undefined> {
    return this.findRegionWithDeployment(this.credentials, this.config, backupPlanName);
  }

  // the code that creates a backup plan from AWS Backup, triggered by ScheduleBackupCommand.ts
  public async createBackupPlan(backupPlanName: string, backupPlanSchedule: string, failureSnsTopicArn?: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
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
    const regions = await this.findAllRegionsWithDeployments(this.credentials, this.config);
    for (const region of regions) {
      const Backup = await this.getAwsBackupClient(region)
      try {
        await Backup.createBackupVault({
          BackupVaultName: backupPlanName,
          BackupVaultTags: {
            account: this.config.account,
            region,
          },
        }).promise();
        const backupPlan = await Backup.createBackupPlan({
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
            account: this.config.account,
            region,
          },
        }).promise();
        await Backup.createBackupSelection({
          BackupPlanId: backupPlan.BackupPlanId as string,
          BackupSelection: {
            IamRoleArn: `arn:aws:iam::${this.config.account}:role/fusebit-backup-role`,
            SelectionName: 'DynamoDB',
            ListOfTags: [
              {
                ConditionKey: 'account',
                ConditionType: 'STRINGEQUALS',
                ConditionValue: this.config.account,
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
      } catch (e) {
        if (e && e === 'ResourceAlreadyExistsException') {
          throw new Error(`Backup plan ${backupPlanName} already exists`);
        } else {
          throw Error(e);
        }
      }
    }
  }

  // deletes a backup plan from AWS Backup, triggered by DeleteBackupCommand.ts
  public async deleteBackupPlan(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
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
    const regions = await this.findAllRegionsWithDeployments(this.credentials, this.config);
    for (const region of regions) {
      const BackupPlanIdIfExists = await this.getBackupIdByName(this.credentials, region, backupPlanName);
      if (BackupPlanIdIfExists === undefined) {
        continue;
      }
      const Backup = await this.getAwsBackupClient(region)
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
      try {
        await Backup.deleteBackupVault({
          BackupVaultName: backupPlanName as string,
        }).promise();
      } catch (e) {
        this.input.io.writeLine('Vault still have backups, this will require manual intervention.');
      }
    }
  }

  // helper function, get backup plan id by the friendly name of the backup plan
  private async getBackupIdByName(credentials: IAwsCredentials, region: string, BackupName: string): Promise<string> {
    const Backup = await this.getAwsBackupClient(region)

    const listResult = await Backup.listBackupPlans().promise();

    for (const i of listResult.BackupPlansList as AWS.Backup.BackupPlansList) {
      if (i.BackupPlanName === BackupName) {
        return i.BackupPlanId as string;
      }
    }
    return '';
  }

  // list backup plans available in all AWS regions, triggered by GetBackupCommand.ts
  public async listBackupPlans() {
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
    const regions = await this.findAllRegionsWithDeployments(this.credentials, this.config);
    const backupPlans: any = { BackupPlansList: [] };
    for (const i of regions) {
      const Backup = await this.getAwsBackupClient(i)
      try {
        const backupPlansResult = await Backup.listBackupPlans().promise();

        backupPlans.BackupPlansList = [
          ...(backupPlansResult.BackupPlansList as AWS.Backup.BackupPlansList),
          ...backupPlans.BackupPlansList,
        ];
      } catch (e) {
        throw Error(e);
      }
    }
    return backupPlans;
  }

  // display driver for showing backup plans
  public async displayBackupPlans(data: any) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(await this.sanitizeBackupPlans(data), null, 2));
    } else if (this.input.options.output === 'pretty') {
      const sanitized = await this.sanitizeBackupPlans(data);
      for (const backupPlan of sanitized.Backup) {
        await this.input.io.writeLine(`Backup Exists in Fusebit Platform: ${backupPlan}`);
      }
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
    return { Backup: data.BackupPlansList.map((item: any) => item.BackupPlanName + ' ' + item.BackupPlanId) };
  }

  // helper function: find all regions that have deployments and the region of ops tables
  public async findAllRegionsWithDeployments(credentials: IAwsCredentials, config: IAwsConfig): Promise<string[]> {
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
    return region;
  }

  // find the region of the specified deployment
  public async findRegionWithDeployment(
    credentials: IAwsCredentials,
    config: IAwsConfig,
    backupId: string
  ): Promise<AWS.Backup.GetBackupPlanOutput | undefined> {
    const regions = await this.findAllRegionsWithDeployments(credentials, config);
    for (const i of regions) {
      const Backup = await this.getAwsBackupClient(i)
      try {
        return await Backup.getBackupPlan({
          BackupPlanId: backupId,
        }).promise();
      } catch (e) {
        continue;
      }
    }
    return undefined;
  }

  // display driver for getting specific backup plan
  public async displayGetBackupPlan(backupPlan: any) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLine(JSON.stringify(await this.sanitizeGetBackupPlans(backupPlan), null, 2));
    } else {
      await this.input.io.writeLine(
        `backup plan name: ${backupPlan.BackupPlan.backupPlanName}, the schedule its running on is ${backupPlan.BackupPlan.Rules[0].ScheduleExpression}`
      );
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
