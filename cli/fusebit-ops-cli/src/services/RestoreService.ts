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

  public async restoreFromBackup(forceRemove: boolean, deploymentName: string, backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const info = await this.executeService.execute(
      {
        header: 'starting a restore job',
        message: `start restore on deployment ${deploymentName}`,
        errorHeader: 'something went wrong during restore',
      },
      () => this.restorefromBackupDriver(forceRemove, deploymentName, backupPlanName)
    );
  }
  /**
   * This function drives a full restore
   *
   * @param {boolean} forceRemove
   * @param {string} deploymentName
   * @param {string} backupPlanName
   * @memberof RestoreService
   */
  public async restorefromBackupDriver(forceRemove: boolean, deploymentName: string, backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContextImpl();
    const profileService = await ProfileService.create(this.input);
    const profile = await profileService.getProfileOrDefaultOrThrow();
    const userCreds = await this.opsService.getUserCredsForProfile(profile);
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    if (!forceRemove) {
      if (
        !this.checkAllTablesExist(
          deploymentName,
          credentials,
          backupPlanName,
          (await this.findRegionFromDeploymentName(deploymentName, config, credentials)) as string
        )
      ) {
        await this.input.io.write("can't find a valid backup for all tables, use --force to proceed");
        return;
      }
    }
    const region = await this.findRegionFromDeploymentName(deploymentName, config, credentials);
    // The end of the world.
    await this.deleteAllExistingDynamoDBTable(deploymentName, config, credentials);
    for (const tableSuffix of this.dynamoTableSuffix) {
      const tableName: string = `${deploymentName}.${tableSuffix}`;
      const restorePoint = await this.findLatestRecoveryPointOfTable(
        credentials,
        tableName,
        backupPlanName,
        region as string
      );
      const Backup = new AWS.Backup({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        region: region as string,
      });
      await Backup.startRestoreJob({
        IamRoleArn: `arn:aws:iam::${config.account}:role/fusebit-backup-role`,
        RecoveryPointArn: restorePoint.RecoveryPointArn,
        ResourceType: 'DynamoDB',
        Metadata: {
          targetTableName: `${deploymentName}.${tableSuffix}`
        },
      }).promise();
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
  ): Promise<any | undefined> {
    const Backup = new AWS.Backup({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region: deploymentRegion,
    });
    const availableRestorePoints = await Backup.listRecoveryPointsByBackupVault({
      BackupVaultName: backupPlanName,
    }).promise();
    if ((availableRestorePoints.RecoveryPoints as AWS.Backup.RecoveryPointByBackupVaultList).length === 0) {
      return undefined;
    }
    const restorePoints = await this.filterRestorePointsByTableNameAndBackupVaultName(
      tableName,
      backupPlanName,
      availableRestorePoints.RecoveryPoints as AWS.Backup.RecoveryPointByBackupVaultList
    );
    if (restorePoints.length === 0) {
      return undefined;
    }
    const restorePointDateList: Date[] = [];
    for (const restorePoint of restorePoints) {
      restorePointDateList.push(restorePoint.CreationDate as Date);
    }
    const latestDate = await this.returnLatestDate(restorePointDateList);
    for (const restorePoint of restorePoints) {
      if ((restorePoint.CreationDate as Date).toString() === latestDate.toString()) {
        return restorePoint;
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

  private async checkAllTablesExist(
    deploymentName: string,
    credentials: IAwsCredentials,
    backupPlanName: string,
    deploymentRegion: string
  ): Promise<boolean> {
    for (const tableSuffix of this.dynamoTableSuffix) {
      if (
        (await this.findLatestRecoveryPointOfTable(
          credentials,
          `${deploymentName}.${tableSuffix}`,
          backupPlanName,
          deploymentRegion
        )) === undefined
      ) {
        return false;
      }
    }
    return true;
  }
}
