import AWS from 'aws-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { AwsCreds, IAwsConfig } from '@5qtrs/aws-config';
import { IAwsCredentials } from '@5qtrs/aws-cred';

export class RestoreService {
  private opsService: OpsService;
  private executeService: ExecuteService;
  private input: IExecuteInput;

  private dynamoTableSuffix: string[] = [
    'subscription',
    'access',
    'account',
    'audit2',
    'client',
    'identity',
    'init',
    'issuer',
    'key-value',
    'log',
    'storage',
    'user',
  ];

  private awsBackupRestoreRateLimit: number;

  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    return new RestoreService(opsSvc, execSvc, input);
  }

  public constructor(opsSvc: OpsService, execSvc: ExecuteService, input: IExecuteInput) {
    this.opsService = opsSvc;
    this.executeService = execSvc;
    this.input = input;
    this.awsBackupRestoreRateLimit = this.input.options['restore-rate-limit'] as number;
  }

  public async listRestorePoints(backupNamePlan: string, deploymentName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const deploymentData = opsDataContext.deploymentData;
    const info = await this.executeService.execute(
      {
        header: 'Listing Restore Points',
        message: 'Listing all restore points',
        errorHeader: 'Something went wrong while trying to list restore points',
      },
      () => this.listRestorePointsDriver(backupNamePlan, deploymentName)
    );
  }

  private async restoreDynamoDBTableFromAWSBackup(
    backupVaultName: string,
    tableName: string,
    tableArn: string,
    credentials: IAwsCredentials,
    config: IAwsConfig,
    deploymentRegion: string
  ) {
    const Backup = new AWS.Backup({
      region: deploymentRegion,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });
  }

  public async listRestorePointsDriver(backupPlanName: string, deploymentName: string) {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const Backup = new AWS.Backup({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region: await this.findRegionFromDeploymentName(deploymentName, config, credentials),
    });

    const results = await Backup.listRecoveryPointsByBackupVault({
      BackupVaultName: backupPlanName,
    }).promise();
    for (const tableSuffix of this.dynamoTableSuffix) {
      /*console.log(
        await this.filterRestorePointsByTableNameAndBackupVaultName(
          `${deploymentName}.${tableSuffix}`,
          backupPlanName,
          results.RecoveryPoints as AWS.Backup.RecoveryPointByBackupVaultList
        )
        
      );*/
    }
    const result = await this.filterRestorePointsByTableNameAndBackupVaultName(
      `${deploymentName}.audit2`,
      backupPlanName,
      results.RecoveryPoints as AWS.Backup.RecoveryPointByBackupVaultList
    );
    for (const cp of result) {
      console.log(cp.CreationDate as Date);
    }
  }

  private async deleteAllExistingDynamoDBTable(
    deploymentName: string,
    config: IAwsConfig,
    credentials: IAwsCredentials
  ) {
    const dynamoDB = new AWS.DynamoDB({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region: await this.findRegionFromDeploymentName(deploymentName, config, credentials),
    });

    for (const tableSuffix of this.dynamoTableSuffix) {
      const table = `${deploymentName}.${tableSuffix}`;
      await dynamoDB
        .deleteTable({
          TableName: table,
        })
        .promise();
    }
  }

  private async findRegionFromDeploymentName(deploymentName: string, config: IAwsConfig, credentials: IAwsCredentials) {
    const dynamoDB = new AWS.DynamoDB({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region: config.region,
      apiVersion: '2012-08-10',
    });

    const results = await dynamoDB
      .scan({
        TableName: 'ops.deployment',
      })
      .promise();
    for (const item of results.Items as AWS.DynamoDB.ItemList) {
      if (item.deploymentName.S === deploymentName) {
        return item.region.S as string;
      }
    }
    return undefined;
  }

  private async filterRestorePointsByTableNameAndBackupVaultName(
    tableName: string,
    backupVaultName: string,
    restorePointList: AWS.Backup.RecoveryPointByBackupVaultList
  ): Promise<AWS.Backup.RecoveryPointByBackupVault[]> {
    const result: AWS.Backup.RecoveryPointByBackupVault[] = [];
    for (const recPoint of restorePointList) {
      if (recPoint.BackupVaultName !== backupVaultName) {
        continue;
      }
      if (recPoint.ResourceArn?.includes(tableName)) {
        result.push(recPoint);
      }
    }
    return result;
  }

  private async findLatestRecoveryPointOfTable(
    credentials: IAwsCredentials,
    tableName: string,
    backupPlanName: string,
    deploymentRegion: string
  ) {
    const Backup = new AWS.Backup({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region: deploymentRegion,
    });
    const availableRestorePoints = await Backup.listRecoveryPointsByBackupVault({
      BackupVaultName: backupPlanName,
    }).promise();
    const restorePoints = await this.filterRestorePointsByTableNameAndBackupVaultName(
      tableName,
      backupPlanName,
      availableRestorePoints.RecoveryPoints as AWS.Backup.RecoveryPointByBackupVaultList
    );
    const restorePointDateList: Date[] = [];
    for (const restorePoint of restorePoints) {
      restorePointDateList.push(restorePoint.CreationDate as Date)
    }
    const latestDate = await this.returnLatestDate(restorePointDateList)
    for (const restorePoint of restorePoints) {
      if ((restorePoint.CreationDate as Date).toString() === latestDate.toString()) {
        return restorePoint
      }
    }
  }

  private async returnLatestDate(recoveryPointDates: Date[]): Promise<Date> {
    if (recoveryPointDates.length === 1) {
      return recoveryPointDates[0];
    }
    let newest: Date = recoveryPointDates[0];
    for (const d of recoveryPointDates) {
      if (d > newest) {
        newest = d;
      }
    }
    return newest;
  }
}
