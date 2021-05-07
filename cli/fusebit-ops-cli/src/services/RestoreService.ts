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

  /**
   * restore from backup magic
   *
   * @param {boolean} forceRemove
   * @param {string} deploymentName
   * @param {string} backupPlanName
   * @memberof RestoreService
   */
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
      await this.startRestoreJobAndMakeSureItFinishes(
        restorePoint.RecoveryPointArn,
        tableName,
        credentials,
        config,
        region as string
      );
    }
  }

  /**
   * start a restore job and make sure the job finishes
   *
   * @private
   * @param {string} restorePointArn
   * @param {string} tableName
   * @param {IAwsCredentials} credentials
   * @param {IAwsConfig} config
   * @param {string} region
   * @memberof RestoreService
   */
  private async startRestoreJobAndMakeSureItFinishes(
    restorePointArn: string,
    tableName: string,
    credentials: IAwsCredentials,
    config: IAwsConfig,
    region: string
  ) {
    const DynamoDB = new AWS.DynamoDB({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      region,
      apiVersion: '2012-08-10',
    });
    let success: boolean = false;
    while (!success) {
      await DynamoDB.restoreTableFromBackup({
        BackupArn: restorePointArn,
        TargetTableName: tableName,
      })
        .promise()
        .then((data) => {
          success = true;
        })
        .catch(async (err) => {
          await setTimeout(() => {}, 10000);
        });
    }
  }
  /**
   * delete all existing ddb table
   *
   * @private
   * @param {string} deploymentName
   * @param {IAwsConfig} config
   * @param {IAwsCredentials} credentials
   * @memberof RestoreService
   */
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
        .promise()
        .catch((data) => {});
    }
  }
  
  /**
   * finds the region in which the deployment resides
   *
   * @private
   * @param {string} deploymentName
   * @param {IAwsConfig} config
   * @param {IAwsCredentials} credentials
   * @return {*} 
   * @memberof RestoreService
   */
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

  /**
   * filter restore points search by table name and backup vault name
   *
   * @private
   * @param {string} tableName
   * @param {string} backupVaultName
   * @param {AWS.Backup.RecoveryPointByBackupVaultList} restorePointList
   * @return {*}  {Promise<AWS.Backup.RecoveryPointByBackupVault[]>}
   * @memberof RestoreService
   */
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

  /**
   * find the latest restore point of a table
   *
   * @private
   * @param {IAwsCredentials} credentials
   * @param {string} tableName
   * @param {string} backupPlanName
   * @param {string} deploymentRegion
   * @return {*}  {(Promise<any | undefined>)}
   * @memberof RestoreService
   */
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

  /**
   * returns the lastest date given a list of date
   *
   * @private
   * @param {Date[]} recoveryPointDates
   * @return {*}  {Promise<Date>}
   * @memberof RestoreService
   */
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

  /**
   * check all tables exists
   *
   * @private
   * @param {string} deploymentName
   * @param {IAwsCredentials} credentials
   * @param {string} backupPlanName
   * @param {string} deploymentRegion
   * @return {*}  {Promise<boolean>}
   * @memberof RestoreService
   */
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
