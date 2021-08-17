import AWS from 'aws-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { AwsCreds, IAwsConfig } from '@5qtrs/aws-config';
import { IAwsCredentials } from '@5qtrs/aws-cred';
import { dynamoScanTable } from '@5qtrs/constants';

interface backupPlanListItem {
  backupPlanInfo: AWS.Backup.BackupPlansListMember;
  region: string;
}

interface listBackupPlansOutput {
  backupPlans: backupPlanListItem[];
}

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

  // Get AWS Backup.
  private async getAwsBackupClient(region: string) {
    return new AWS.Backup({
      accessKeyId: this.credentials.accessKeyId,
      secretAccessKey: this.credentials.secretAccessKey,
      sessionToken: this.credentials.sessionToken,
      region,
    });
  }

  // The code that gets a backup plan from AWS Backup, triggered by GetBackupCommand.ts.
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

  // The actual backend driver for get backup plan, triggered by getBackupPlan.
  public async getBackupPlanDriver(backupPlanName: string): Promise<AWS.Backup.GetBackupPlanOutput | undefined> {
    return this.findRegionWithDeployment(this.credentials, this.config, backupPlanName);
  }

  // The code that creates a backup plan from AWS Backup, triggered by ScheduleBackupCommand.ts.
  public async createBackupPlan(backupPlanName: string, backupPlanSchedule: string, failureSnsTopicArn?: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const info = await this.executeService.execute(
      {
        header: 'Creating Backup Plan',
        message: 'Creating the backup plan in every region where the Fusebit platform is deployed',
        errorHeader: 'Creation of Backup Plans Failed',
      },
      () => this.createBackupPlanDriver(backupPlanName, backupPlanSchedule, failureSnsTopicArn)
    );
    return info;
  }

  // The actual backend driver for creating backup plan, triggered by createBackupPlan.
  private async createBackupPlanDriver(
    backupPlanName: string,
    backupPlanSchedule: string,
    failureSnsTopicArn?: string
  ) {
    const regions = await this.findAllRegionsWithDeployments(this.credentials, this.config);
    for (const region of regions) {
      const Backup = await this.getAwsBackupClient(region);
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
                Lifecycle: {
                  DeleteAfterDays: 15,
                },
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
          }).promise();
        }
      } catch (e) {
        if (e && e === 'ResourceAlreadyExistsException') {
          await this.deleteBackupPlanDriver(backupPlanName);
          await this.createBackupPlanDriver(backupPlanName, backupPlanSchedule, failureSnsTopicArn);
        }
        throw Error(e);
      }
    }
  }

  // Deletes a backup plan from AWS Backup, triggered by DeleteBackupCommand.ts.
  public async deleteBackupPlan(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const info = this.executeService.execute(
      {
        header: 'Deleting Backup Plans',
        message: `Deleting backup plans ${backupPlanName}.`,
        errorHeader: `Something went wrong during deletion.`,
      },
      () => this.deleteBackupPlanDriver(backupPlanName)
    );
    return info;
  }

  // The actual driver for delete Backup plan, deletes backup plan from AWS Backup, triggered by deleteBackupPlan().
  private async deleteBackupPlanDriver(backupPlanName: string) {
    const regions = await this.findAllRegionsWithDeployments(this.credentials, this.config);
    for (const region of regions) {
      const BackupPlanIdIfExists = await this.getBackupIdByName(this.credentials, region, backupPlanName);
      if (BackupPlanIdIfExists === '') {
        continue;
      }
      const Backup = await this.getAwsBackupClient(region);
      const results = await Backup.listBackupSelections({
        BackupPlanId: BackupPlanIdIfExists as string,
      }).promise();
      for (const i of results.BackupSelectionsList as AWS.Backup.BackupSelectionsList) {
        await Backup.deleteBackupSelection({
          BackupPlanId: BackupPlanIdIfExists as string,
          SelectionId: i.SelectionId as string,
        }).promise();
      }
      await Backup.deleteBackupSelection({
        BackupPlanId: BackupPlanIdIfExists as string,
        SelectionId: 'DynamoDB',
      });
      await Backup.deleteBackupPlan({
        BackupPlanId: BackupPlanIdIfExists as string,
      }).promise();
      let nextToken = 'xxx';
      while (nextToken != '') {
        const backupsToRemoves = await Backup.listRecoveryPointsByBackupVault({
          BackupVaultName: backupPlanName,
        }).promise();
        for (const backup of backupsToRemoves.RecoveryPoints as AWS.Backup.RecoveryPointByBackupVaultList) {
          await Backup.deleteRecoveryPoint({
            BackupVaultName: backupPlanName,
            RecoveryPointArn: backup.RecoveryPointArn as string,
          }).promise();
        }
        nextToken = backupsToRemoves.NextToken ? backupsToRemoves.NextToken : '';
      }
      try {
        await Backup.deleteBackupVault({
          BackupVaultName: backupPlanName as string,
        }).promise();
      } catch (e) {
        this.input.io.writeLine('Vault still have backups, this will require manual intervention.');
      }
    }
  }

  // Helper function, get backup plan id by the friendly name of the backup plan.
  private async getBackupIdByName(credentials: IAwsCredentials, region: string, BackupName: string): Promise<string> {
    const Backup = await this.getAwsBackupClient(region);

    const listResult = await Backup.listBackupPlans().promise();

    for (const i of listResult.BackupPlansList as AWS.Backup.BackupPlansList) {
      if (i.BackupPlanName === BackupName) {
        return i.BackupPlanId as string;
      }
    }
    return '';
  }

  // List backup plans available in all AWS regions, triggered by GetBackupCommand.ts.
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

  // The actual driver for backup plan, trigged by listBackupPlan().
  private async listBackupPlanDriver() {
    const regions = await this.findAllRegionsWithDeployments(this.credentials, this.config);
    let backupPlans: listBackupPlansOutput = { backupPlans: [] };
    for (const region of regions) {
      const Backup = await this.getAwsBackupClient(region);
      const backupPlansResult = await Backup.listBackupPlans().promise();
      for (const backupPlan of backupPlansResult.BackupPlansList as AWS.Backup.BackupPlansList) {
        backupPlans.backupPlans.push({
          backupPlanInfo: backupPlan,
          region,
        });
      }
    }
    return backupPlans;
  }

  // Display driver for showing backup plans.
  public async displayBackupPlans(data: any) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(await this.sanitizeBackupPlans(data), null, 2));
    } else if (this.input.options.output === 'pretty') {
      const sanitized = await this.sanitizeBackupPlans(data);
      await this.input.io.writeLine('Backups on the Fusebit platform: ');
      for (const backupPlan of sanitized.Backup) {
        await this.input.io.writeLine(backupPlan);
      }
    }
  }

  // Sanitize the backup plans result from listBackupPlan().
  public sanitizeBackupPlans(data: any) {
    if (!data) {
      return { backups: [] };
    }
    if (!data.backupPlans) {
      return { backups: [] };
    }
    return {
      Backup: data.backupPlans.map(
        (item: any) => item.backupPlanInfo.BackupPlanName + ' ' + item.backupPlanInfo.BackupPlanId + ' ' + item.region
      ),
    };
  }

  // Helper function: find all regions that have deployments and the region of ops tables.
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
      TableName: 'ops.deployment',
    };
    const results = await dynamoScanTable(ddb, scanParams);
    if (!results) {
      throw Error('can not find ops.deployment table');
    }
    if (!results) {
      throw Error("can't find items in ops.deployment table");
    }

    if ((results.length as number) === 0) {
      throw new Error('no deployment found');
    }
    for (const i of results) {
      if (!region.includes((i.regionStackId.S as string).split('::')[0] as string)) {
        region.push((i.regionStackId.S as string).split('::')[0]);
        console.log(i.regionStackId.S);
      }
    }
    if (!region.includes(config.region)) {
      region.push(config.region);
    }
    return region;
  }

  // Find the region of the specified deployment.
  public async findRegionWithDeployment(
    credentials: IAwsCredentials,
    config: IAwsConfig,
    backupId: string
  ): Promise<AWS.Backup.GetBackupPlanOutput | undefined> {
    const regions = await this.findAllRegionsWithDeployments(credentials, config);
    for (const i of regions) {
      const Backup = await this.getAwsBackupClient(i);
      try {
        return await Backup.getBackupPlan({
          BackupPlanId: backupId,
        }).promise();
      } catch (e) {
        if (e.code === 'ERROR_2202') {
          continue;
        }
        throw Error(e);
      }
    }
    return undefined;
  }

  // Display driver for getting specific backup plan.
  public async displayGetBackupPlan(backupPlan: any): Promise<string> {
    if (this.input.options.output === 'json') {
      return JSON.stringify(await this.sanitizeGetBackupPlans(backupPlan), null, 2);
    } else {
      return `backup plan name: ${backupPlan.BackupPlan.BackupPlanName}, the schedule its running on is ${backupPlan.BackupPlan.Rules[0].ScheduleExpression}`;
    }
  }

  // Sanitize the result of getBackupPlan for the display driver.
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
