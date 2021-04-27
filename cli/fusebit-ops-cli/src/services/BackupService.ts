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

  public async getBackupPlan(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;
    const exists = await this.executeService.execute(
      {
        header: 'Get Backup Plan',
        message: `Get the information of the ${backupPlanName} backup plan`,
        errorHeader: 'Backup plan error',
      },
      () => this.getBackupPlanDriver(backupPlanName)
    );
  }
  public async getBackupPlanDriver(backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const userCreds = await this.opsService.getUserCredsForProfile(profile);
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const results = await this.findRegionWithDeployment(credentials, config, backupPlanName);
    console.log(results)
    return results
  }
  public async checkBackupPlanExists(backupPlanName: string, region: string): Promise<string> {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;
    const exists = await this.executeService.execute(
      {
        header: 'Backup Plan Check',
        message: `Determining if the ${backupPlanName} backup plan exists`,
        errorHeader: 'Backup plan error',
      },
      () => this.checkBackupPlanExistsDriver(backupPlanName, region)
    );
    if (exists) {
      this.executeService.warning('Backup Plan Exists', `${backupPlanName} does exists`);
      throw new Error('Backup plan already exists');
    }
    return new Promise((res, _) => {
      res(backupPlanName);
    });
  }

  private async checkBackupPlanExistsDriver(backupPlanName: string, region: string): Promise<boolean> {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const userCreds = await this.opsService.getUserCredsForProfile(profile);
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();

    const params = {
      BackupPlanId: backupPlanName,
    };

    const Backup = new AWS.Backup({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region,
    });
    return new Promise(async (res, rej) => {
      await Backup.getBackupPlan(params)
        .promise()
        .then((data) => {
          res(data.BackupPlan === undefined);
        })
        .catch((err) => {
          rej(err);
        });
    });
  }

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
      let Backup = new AWS.Backup({
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
    return new Promise((res, rej) => {
      res(backupPlans);
    });
  }

  public async displayBackupPlans(data: any) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(await this.sanitizeBackupPlans(data), null, 2));
    } else if (this.input.options.output === 'pretty') {
      this.input.io.writeLine('not implemented');
    }
  }

  public sanitizeBackupPlans(data: any) {
    if (!data) {
      return { backups: [] };
    }
    if (!data.BackupPlansList) {
      return { backups: [] };
    }
    return { Backup: data.BackupPlansList.map((item: any) => item.BackupPlanId) };
  }

  public async findAllRegionsWithDeployments(AwsCreds: any, Config: any): Promise<string[]> {
    const region: string[] = [];
    const ddb = new AWS.DynamoDB({
      region: Config.region,
      accessKeyId: AwsCreds.accessKeyId,
      secretAccessKey: AwsCreds.secretAccessKey,
      sessionToken: AwsCreds.sessionToken,
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
          if (!region.includes(i.regionStackId.S?.split('::')[0] as string)) {
            region.push((i.regionStackId.S as string).split('::')[0]);
          }
        }
      });
    return new Promise((res, rej) => {
      res(region);
    });
  }

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
      }).promise().then((data) => {
        result = data;
      }).catch((err) => {})
    }
    console.log(result)
    return result
  }
  public async displayGetBackupPlans(backupPlan: any) {
    if (this.input.options.output === 'json') {
      await this.input.io.writeLine(JSON.stringify(await this.sanitizeGetBackupPlans(backupPlan), null, 2));
    } else if (this.input.options.output === 'pretty') {
      this.input.io.writeLine('not implemented');
    }
  }

  private async sanitizeGetBackupPlans(backupPlan: any) {
    console.log(backupPlan)
    if (!backupPlan) {
      return {}
    }
    return {
      BackupPlan: backupPlan.BackupPlan.BackupPlanName,
      Rules: [...backupPlan.BackupPlan.Rules]
    }
  }
}
