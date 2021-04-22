import AWS from 'aws-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';

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

    const Backup = new AWS.Backup({ region });
    return new Promise(async (res, rej) => {
      await Backup.getBackupPlan(params)
        .promise()
        .then((data) => {
          return data.BackupPlan === undefined;
        });
    });
  }

  public async listBackupPlan(region: string): Promise<any> {
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
    const Backup = new AWS.Backup({ region });

    return Backup.listBackupPlans({}).promise();
  }
}
