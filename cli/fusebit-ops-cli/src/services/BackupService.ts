import AWS from 'aws-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { OpsDataAwsContext, OpsDataAwsProvider } from '@5qtrs/ops-data-aws';
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
    const params = {
      BackupPlanId: backupPlanName,
    };

    const Backup = new AWS.Backup();
    return new Promise(async (res, rej) => {
      await Backup.getBackupPlan(params)
        .promise()
        .then((data) => {
          return data.BackupPlan === undefined;
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
      () => this.listBackupPlanDriver(region)
    );
    return listing;
  }

  private async listBackupPlanDriver(region: string) {
    const opsDataContext = await this.opsService.getOpsDataContextImpl()
    const profileService = await ProfileService.create(this.input)
    const profile = await profileService.getProfileOrDefaultOrThrow()
    const userCreds = await this.opsService.getUserCredsForProfile(profile)
    const config = await opsDataContext.provider.getAwsConfigForMain()
    const credentials = await (config.creds as AwsCreds).getCredentials()
    const Backup = new AWS.Backup({
      region: 'us-west-1',
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    });

    return Backup.listBackupPlans({}).promise();
  }

  public async displayBackupPlans(data: any) {
    if (this.input.options.output === 'json') {
      this.input.io.writeLine(JSON.stringify(data, null, 2));
    }
  }
}
