import * as AWS from 'aws-sdk';
import * as Model from './model';
import { PromiseResult } from 'aws-sdk/lib/request';
import httpError from 'http-errors';
import { FinalStatementOptions, IDaoCollection, IRds, IRdsCredentials } from './model';
import Connector from './daos/connector';
import Integration from './daos/integration';
import Storage from './daos/storage';
import Session from './daos/session';
import Identity from './daos/identity';
import Install from './daos/install';
import { random } from '@5qtrs/random';

class RDS implements IRds {
  private rdsSdk!: AWS.RDSDataService;
  private rdsCredentials!: Model.IRdsCredentials;
  private purgeInterval!: NodeJS.Timeout;
  private readonly defaultAuroraDatabaseName = 'fusebit';
  private readonly defaultPurgeInterval = 10 * 60 * 1000;
  private lastHealth = false;
  private lastHealthExecution: number = new Date(0).getTime();
  private lastGetRequestId = '';
  private lastUpdateRequestId = '';
  private readonly RDS_HEALTH_CHECK_TTL = 10 * 1000;
  private readonly RDS_HEALTH_TEST_ACC_ID = 'acc-000000000000';
  private readonly RDS_HEALTH_TEST_SUB_ID = 'sub-000000000000';
  private readonly RDS_HEALTH_ENT_ID_PREFIX = 'health-';
  private readonly RDS_HEALTH_MAX_ACCEPTABLE_TTL = this.RDS_HEALTH_CHECK_TTL + 3 * 1000;
  private readonly RDS_HEALTH_ENTITY_EXPIRE = 5 * 1000;
  private healthError: any;

  public async purgeExpiredItems(): Promise<boolean> {
    try {
      const { rdsSdk, rdsCredentials } = await this.ensureConnection();
      const sql = `DELETE FROM entity WHERE expires < NOW()`;
      const result = await rdsSdk
        .executeStatement({
          ...rdsCredentials,
          sql,
        })
        .promise();
      return true;
    } catch (e) {
      return false;
    }
  }

  public async ensureConnection(): Promise<{
    rdsSdk: AWS.RDSDataService;
    rdsCredentials: IRdsCredentials;
  }> {
    if (!this.rdsSdk) {
      const secretsManager = new AWS.SecretsManager({
        apiVersion: '2017-10-17',
      });
      const params = {
        Filters: [
          { Key: 'tag-key', Values: ['fusebitDeployment'] },
          { Key: 'tag-value', Values: [process.env.DEPLOYMENT_KEY as string] },
        ],
      };
      const data = await secretsManager.listSecrets(params).promise();
      if (!data.SecretList) {
        throw new Error(
          `Cannot find a unique secret to access Aurora cluster in the Secrets Manager. Expected 1 matching secret, found 0. Delete the Aurora cluster and try again.`
        );
      }
      let filteredSecrets: AWS.SecretsManager.SecretListEntry[] = [];

      for (const secret of data.SecretList) {
        if (
          secret.Name?.match(`^rds-db-credentials/fusebit-db-secret-${process.env.DEPLOYMENT_KEY}-[a-zA-Z0-9]{20}$`)
        ) {
          filteredSecrets.push(secret);
        }
      }
      if (filteredSecrets.length !== 1) {
        throw new Error(
          `Cannot find a unique secret to access Aurora cluster in the Secrets Manager. Expected 1 matching secret, found ${
            filteredSecrets.length !== 0 ? filteredSecrets.length : '0. Delete the Aurora cluster and try again'
          }`
        );
      }
      const dbArnTag = filteredSecrets[0].Tags?.find((t) => t.Key === 'dbArn');
      if (!dbArnTag) {
        throw new Error(
          `The secret to access Aurora cluster found in the Secrets Manager does not specify the database ARN.`
        );
      }
      this.rdsSdk = new AWS.RDSDataService({
        apiVersion: '2018-08-01',
        params: {
          database: this.defaultAuroraDatabaseName,
        },
      });
      this.rdsCredentials = {
        resourceArn: dbArnTag.Value as string,
        secretArn: filteredSecrets[0].ARN as string,
      };
      if (process.env.API_STACK_VERSION !== 'dev') {
        this.purgeInterval = setInterval(() => this.purgeExpiredItems(), this.defaultPurgeInterval).unref();
        setTimeout(() => this.purgeExpiredItems(), 0).unref();
      }
    }
    return { rdsSdk: this.rdsSdk, rdsCredentials: this.rdsCredentials };
  }

  public updateHealth = async () => {
    // Queue up the next health check
    setTimeout(this.updateHealth, this.RDS_HEALTH_CHECK_TTL);

    // Check the ability to read and write to the database
    const entity = {
      accountId: this.RDS_HEALTH_TEST_ACC_ID,
      subscriptionId: this.RDS_HEALTH_TEST_SUB_ID,
      id: `${this.RDS_HEALTH_ENT_ID_PREFIX}${random({ lengthInBytes: 8 })}`,
      data: { checked: Date.now() },
      expires: new Date(Date.now() + this.RDS_HEALTH_ENTITY_EXPIRE).toISOString(),
    };
    try {
      const update = await this.DAO.storage.createEntity(entity);
      const updateRequestId = (update as any)['$response']?.requestId;
      const get = await this.DAO.storage.getEntity(entity);
      const getRequestId = (get as any)['$response']?.requestId;
      const duration = Date.now() - entity.data.checked;

      if (duration > this.RDS_HEALTH_MAX_ACCEPTABLE_TTL) {
        console.log(
          `RDS ERROR: Excessive interval between start of update and conclusion of get: ${duration}ms. Get requestId: ${getRequestId} Update requestId: ${updateRequestId}`
        );
      }

      // Validate that the write was committed successfully
      if (update.data && get.data && update.data.checked === get.data.checked) {
        this.lastHealth = true;
        this.healthError = null;
        this.lastGetRequestId = getRequestId;
        this.lastUpdateRequestId = updateRequestId;
        this.lastHealthExecution = Date.now();
      } else {
        throw new Error('RDS ERROR: Failure was detected when trying to insert entity.');
      }
    } catch (e) {
      if (this.lastHealthExecution < entity.data.checked + this.RDS_HEALTH_ENTITY_EXPIRE) {
        // Only record errors when the last success happened prior to the start time + expiration. This
        // captures situations where a request goes away for a long time, the subsequent getEntity expires,
        // but successful tests have happened in between those two points.
        this.lastHealth = false;
        this.healthError = e;
      }
    }
  };

  public async ensureRDSLiveliness() {
    const timeDifference = Date.now() - this.lastHealthExecution;
    if (!this.lastHealth || !this.lastHealthExecution || timeDifference > this.RDS_HEALTH_MAX_ACCEPTABLE_TTL) {
      if (this.healthError) {
        throw this.healthError;
      }

      if (!this.lastHealthExecution) {
        throw new Error('RDS ERROR: No successful connection to database');
      }

      throw new Error(
        `RDS ERROR: ${timeDifference} exceeded threshold of ${this.RDS_HEALTH_MAX_ACCEPTABLE_TTL}; get requestId: ${this.lastGetRequestId}, update requestId: ${this.lastUpdateRequestId}`
      );
    }
  }

  public async executeStatement(
    sql: string,
    objectParameters: { [key: string]: any } = {},
    statementOptions?: FinalStatementOptions
  ): Promise<PromiseResult<AWS.RDSDataService.ExecuteStatementResponse, AWS.AWSError>> {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();

    const parameters = this.createParameterArray(objectParameters);

    try {
      const result = await rdsSdk
        .executeStatement({
          ...rdsCredentials,
          sql,
          parameters,
          ...statementOptions,
          includeResultMetadata: true,
        })
        .promise();
      return result;
    } catch (e) {
      if (e.message.match(/conflict_data/)) {
        throw new httpError.Conflict();
      }
      if (e.message.match(/not_found/)) {
        throw new httpError.NotFound();
      }
      throw new httpError.InternalServerError(e.message);
    }
  }

  public async executeBatchStatement(
    sql: string,
    objectParameterArray: { [key: string]: any }[]
  ): Promise<PromiseResult<AWS.RDSDataService.BatchExecuteStatementResponse, AWS.AWSError>> {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();

    const parameters = objectParameterArray.map(this.createParameterArray);

    return rdsSdk
      .batchExecuteStatement({
        ...rdsCredentials,
        sql,
        parameterSets: parameters,
      })
      .promise();
  }

  public createParameterArray(parameters: { [key: string]: any }): AWS.RDSDataService.SqlParametersList {
    return Object.keys(parameters).map((key) => {
      let valueKey;
      let value = parameters[key];
      switch (typeof value) {
        case 'object':
          if (value instanceof Date) {
            valueKey = 'stringValue';
            value = value.toISOString();
          } else {
            valueKey = 'stringValue';
            value = JSON.stringify(value);
          }
          break;
        case 'string':
          valueKey = 'stringValue';
          break;
        case 'boolean':
          valueKey = 'booleanValue';
          break;
        case 'number':
          valueKey = (value as number) % 1 === 0 ? (valueKey = 'longValue') : (valueKey = 'doubleValue');
          break;
        default:
          valueKey = 'isNull';
          value = true;
      }
      return {
        name: key,
        value: {
          [valueKey]: value,
        },
      };
    });
  }

  public async createTransaction(): Promise<string> {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk.beginTransaction(rdsCredentials).promise();
    return result.transactionId as string;
  }

  public async commitTransaction(transactionId: string): Promise<string> {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk
      .commitTransaction({
        ...rdsCredentials,
        transactionId,
      })
      .promise();
    return result.transactionStatus as string;
  }

  public async rollbackTransaction(transactionId: string): Promise<string> {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk
      .rollbackTransaction({
        ...rdsCredentials,
        transactionId,
      })
      .promise();
    return result.transactionStatus as string;
  }

  public async inTransaction<T>(func: (transactionalDaos: IDaoCollection) => Promise<T>): Promise<T> {
    const transactionId = await this.createTransaction();
    try {
      const transactionalDaos = {
        connector: this.DAO.connector.createTransactional(transactionId),
        integration: this.DAO.integration.createTransactional(transactionId),
        storage: this.DAO.storage.createTransactional(transactionId),
        session: this.DAO.session.createTransactional(transactionId),
        identity: this.DAO.identity.createTransactional(transactionId),
        install: this.DAO.install.createTransactional(transactionId),
      };

      const result = await func(transactionalDaos);
      await this.commitTransaction(transactionId);
      return result;
    } catch (e) {
      await this.rollbackTransaction(transactionId);
      throw e;
    }
  }

  public readonly DAO: IDaoCollection = {
    connector: new Connector(this),
    integration: new Integration(this),
    storage: new Storage(this),
    session: new Session(this),
    identity: new Identity(this),
    install: new Install(this),
  };

  public ensureRecords(
    result: AWS.RDSDataService.ExecuteStatementResponse
  ): asserts result is AWS.RDSDataService.ExecuteStatementResponse & {
    records: NonNullable<any>;
    columnMetadata: NonNullable<any>;
  } {
    if (!result || !result.records || result.records.length === 0 || !result.columnMetadata) {
      throw new httpError.NotFound();
    }
  }
}

const RDSSingleton: IRds = new RDS();

export default RDSSingleton;
