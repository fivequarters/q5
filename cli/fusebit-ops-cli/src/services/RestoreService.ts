import AWS from 'aws-sdk';
import { IExecuteInput } from '@5qtrs/cli';
import { OpsService } from './OpsService';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { AwsCreds, IAwsConfig } from '@5qtrs/aws-config';
import { IAwsCredentials } from '@5qtrs/aws-cred';

interface ISecretsManagerInput {
  hostname: string;
  resourceId: string;
}

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
  private pollStatusSpeed: number = 3000;
  private auroraDbPrefix: string = 'fusebit-db-';
  private auroraSubnetPrefix: string = 'fusebit-db-subnet-group-';
  private auroraEngine: string = 'aurora-postgresql';
  private auroraVer: string = '10.7';
  private auroraMode: string = 'serverless';
  private finalSnapshotName: string = 'final-snapshot-';
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    return new RestoreService(opsSvc, execSvc, input);
  }

  public constructor(opsSvc: OpsService, execSvc: ExecuteService, input: IExecuteInput) {
    this.opsService = opsSvc;
    this.executeService = execSvc;
    this.input = input;
  }

  public async restoreFromBackup(forceRemove: boolean, deploymentName: string, backupPlanName: string) {
    const opsDataContext = await this.opsService.getOpsDataContext();
    const info = await this.executeService.execute(
      {
        header: 'Start a Restore Job',
        message: `Starting restore on deployment ${deploymentName}.`,
        errorHeader: 'Something went wrong during restore.',
      },
      () => this.restoreFromBackupDriver(forceRemove, deploymentName, backupPlanName)
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
  public async restoreFromBackupDriver(forceRemove: boolean, deploymentName: string, backupPlanName: string) {
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
    await Promise.all(
      this.dynamoTableSuffix.map((tableSuffix) =>
        this.restoreTable(credentials, tableSuffix, deploymentName, backupPlanName, region as string)
      )
    );
    
    await this.deleteAuroraDb(credentials, deploymentName, region as string);
    const restorePoint = (await this.findLatestRecoveryPointOfTable(
      credentials,
      `${this.auroraDbPrefix}${deploymentName}`,
      backupPlanName,
      region as string
    )) as AWS.Backup.RecoveryPointByBackupVault;

    const ids = await this.startDbRestoreJobAndWait(
      restorePoint.RecoveryPointArn as string,
      deploymentName,
      credentials,
      region as string
    );
    await this.updateSecretsManager(credentials, region as string, deploymentName, ids);
  }

  private async deleteAuroraDb(credentials: IAwsCredentials, deploymentName: string, region: string) {
    const dbName = `${this.auroraDbPrefix}${deploymentName}`;
    const RDS = new AWS.RDS({
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      sessionToken: credentials.sessionToken as string,
      region,
    });
    try {
      await RDS.deleteDBCluster({
        DBClusterIdentifier: dbName,
        FinalDBSnapshotIdentifier: `${this.finalSnapshotName}${deploymentName}-${Date.now()}`,
      }).promise();
      while (true) {
        let results = await RDS.describeDBClusters().promise();
        if (results.DBClusters?.filter((cluster) => cluster.DBClusterIdentifier === dbName).length === 0) {
          break;
        }
      }
    } catch (e) {
      if (e.message !== 'DBClusterNotFoundFault') {
        throw Error(e);
      }
    }
  }

  private async restoreTable(
    credentials: IAwsCredentials,
    tableSuffix: string,
    deploymentName: string,
    backupPlanName: string,
    region: string
  ) {
    const restorePoint = (await this.findLatestRecoveryPointOfTable(
      credentials,
      `${deploymentName}.${tableSuffix}`,
      backupPlanName,
      region as string
    )) as AWS.Backup.RecoveryPointByBackupVault;
    await this.startRestoreJobAndWait(
      restorePoint.RecoveryPointArn as string,
      deploymentName,
      tableSuffix,
      credentials,
      region
    );
  }
  /**
   * Updates Secrets Manager with the new Aurora url.
   */
  private async updateSecretsManager(
    credentials: IAwsCredentials,
    region: string,
    deploymentName: string,
    identifier: ISecretsManagerInput
  ) {
    const secretsManager = new AWS.SecretsManager({
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      sessionToken: credentials.sessionToken as string,
      region,
    });
    const secrets = await secretsManager.listSecrets().promise();
    let secret: AWS.SecretsManager.SecretListEntry | undefined;
    for (const potentialSecret of secrets.SecretList as AWS.SecretsManager.SecretListType) {
      if (!(potentialSecret.Name as string).match(`^rds-db-credentials/fusebit-db-secret-${deploymentName}-[a-zA-Z0-9]{20}$`)) {
        secret = potentialSecret;
      }
    }
    const currentSecret = await secretsManager
      .getSecretValue({
        SecretId: secret?.ARN as string,
      })
      .promise();
    let secretString = JSON.parse(currentSecret.SecretString as string);
    secretString.host = identifier.hostname;
    secretString.resourceId = identifier.resourceId;
    await secretsManager
      .updateSecret({
        SecretId: secret?.ARN as string,
        SecretString: JSON.stringify(secretString),
      })
      .promise();
  }

  private async startDbRestoreJobAndWait(
    restorePointArn: string,
    deploymentName: string,
    credentials: IAwsCredentials,
    region: string
  ): Promise<ISecretsManagerInput> {
    const dbName = `${this.auroraDbPrefix}${deploymentName}`;
    const Aurora = new AWS.RDS({
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      sessionToken: credentials.sessionToken as string,
      region,
    });
    const results = await Aurora.restoreDBClusterFromSnapshot({
      Engine: this.auroraEngine,
      EngineVersion: this.auroraVer,
      EngineMode: this.auroraMode,
      SnapshotIdentifier: restorePointArn,
      DBSubnetGroupName: `${this.auroraSubnetPrefix}${deploymentName}`,
      DBClusterIdentifier: `${this.auroraDbPrefix}${deploymentName}`,
    }).promise();
    const clusterHostname = results.DBCluster?.Endpoint as string;
    const clusterResourceId = results.DBCluster?.DbClusterResourceId as string;
    while (true) {
      const status = await Aurora.describeDBClusters({
        DBClusterIdentifier: `${this.auroraDbPrefix}${deploymentName}`,
      }).promise();
      if (((status.DBClusters as AWS.RDS.DBClusterList)[0].Status as string) === 'available') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, this.pollStatusSpeed));
    }
    await Aurora.modifyDBCluster({
      EnableHttpEndpoint: true,
      DBClusterIdentifier: results.DBCluster?.DBClusterIdentifier as string,
    }).promise();
    return { hostname: clusterHostname, resourceId: clusterResourceId };
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
  private async startRestoreJobAndWait(
    restorePointArn: string,
    deploymentName: string,
    tableSuffix: string,
    credentials: IAwsCredentials,
    region: string
  ) {
    const tableName = `${deploymentName}.${tableSuffix}`;
    const DynamoDB = new AWS.DynamoDB({
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      sessionToken: credentials.sessionToken as string,
      region,
      apiVersion: '2012-08-10',
    });
    let success: boolean = false;
    let finished: boolean = false;
    while (!success) {
      try {
        const results = await DynamoDB.restoreTableFromBackup({
          BackupArn: restorePointArn,
          TargetTableName: tableName,
        }).promise();
        success = true;
      } catch (e) {
        if (e.code === 'LimitExceededException' || e.code === 'TableAlreadyExistsException') {
          // If it is rate limited or AWS is giving out eventual consistency issues, it throws these errors. For now we are just sleeping and retry.
          await new Promise((resolve) => setTimeout(resolve, this.pollStatusSpeed));
          continue;
        }
        throw Error(e);
      }
    }
    while (!finished) {
      // there is a super super edge case error, if it happens, simply re run restore command. (AWS' infrastructure's eventual consistency is annoying :()
      const results = await DynamoDB.describeTable({
        TableName: tableName,
      }).promise();
      if (results.Table?.TableStatus !== 'CREATING') {
        finished = true;
        await this.input.io.writeLine(`${tableName} finished restoring`);
      }
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
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      sessionToken: credentials.sessionToken as string,
      region: (await this.findRegionFromDeploymentName(deploymentName, config, credentials)) as string,
    });

    for (const tableSuffix of this.dynamoTableSuffix) {
      const table = `${deploymentName}.${tableSuffix}`;
      try {
        await dynamoDB
          .deleteTable({
            TableName: table,
          })
          .promise();
      } catch (e) {
        if (e.code === 'ResourceNotFoundException') {
          continue;
        }
        throw Error(e);
      }
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
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      sessionToken: credentials.sessionToken as string,
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
  private async filterRestorePoints(
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
  ): Promise<AWS.Backup.RecoveryPointByBackupVault | undefined> {
    const Backup = new AWS.Backup({
      accessKeyId: credentials.accessKeyId as string,
      secretAccessKey: credentials.secretAccessKey as string,
      sessionToken: credentials.sessionToken as string,
      region: deploymentRegion,
    });
    const availableRestorePoints = await Backup.listRecoveryPointsByBackupVault({
      BackupVaultName: backupPlanName,
    }).promise();
    if ((availableRestorePoints.RecoveryPoints as AWS.Backup.RecoveryPointByBackupVaultList).length === 0) {
      return undefined;
    }
    const restorePoints = await this.filterRestorePoints(
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
   * returns the latest date given a list of date
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
