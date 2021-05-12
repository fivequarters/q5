import * as AWS from 'aws-sdk';
import * as Model from './model';
import { PromiseResult } from 'aws-sdk/lib/request';
import httpError from 'http-errors';
import { FinalStatementOptions, IDaoCollection, IRds, IRdsCredentials } from './model';
import Connector from './daos/connector';
import Integration from './daos/integration';
import Storage from './daos/storage';
import Operation from './daos/operation';

class RDS implements IRds {
  private rdsSdk!: AWS.RDSDataService;
  private rdsCredentials!: Model.IRdsCredentials;
  private purgeInterval!: NodeJS.Timeout;
  private readonly defaultAuroraDatabaseName = 'fusebit';
  private readonly defaultPurgeInterval = 10 * 60 * 1000;

  public purgeExpiredItems: () => Promise<boolean> = async () => {
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
  };

  public ensureConnection: () => Promise<{
    rdsSdk: AWS.RDSDataService;
    rdsCredentials: IRdsCredentials;
  }> = async () => {
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
      if (!data.SecretList || data.SecretList.length !== 1) {
        throw new Error(
          `Cannot find a unique secret to access Aurora cluster in the Secrets Manager. Expected 1 matching secret, found ${
            data.SecretList ? data.SecretList.length : 0
          }`
        );
      }
      const dbArnTag = data.SecretList[0].Tags?.find((t) => t.Key === 'dbArn');
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
        secretArn: data.SecretList[0].ARN as string,
      };
      if (process.env.API_STACK_VERSION !== 'dev') {
        this.purgeInterval = setInterval(() => this.purgeExpiredItems(), this.defaultPurgeInterval).unref();
        setTimeout(() => this.purgeExpiredItems(), 0).unref();
      }
    }
    return { rdsSdk: this.rdsSdk, rdsCredentials: this.rdsCredentials };
  };

  public executeStatement: (
    sql: string,
    objectParameters?: { [key: string]: any },
    statementOptions?: FinalStatementOptions
  ) => Promise<PromiseResult<AWS.RDSDataService.ExecuteStatementResponse, AWS.AWSError>> = async (
    sql,
    objectParameters = {},
    statementOptions?
  ) => {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();

    const parameters = this.createParameterArray(objectParameters);

    try {
      return await rdsSdk
        .executeStatement({
          ...rdsCredentials,
          sql,
          parameters,
          ...statementOptions,
          includeResultMetadata: true,
        })
        .promise();
    } catch (e) {
      throw e.message.match(/version_conflict/) ? new httpError.Conflict() : e;
    }
  };

  public createParameterArray: (parameters: { [key: string]: any }) => AWS.RDSDataService.SqlParametersList = (
    parameters
  ) => {
    return Object.keys(parameters).map((key) => {
      let valueKey;
      let value = parameters[key];
      switch (typeof value) {
        case 'object':
          valueKey = value instanceof Date ? (valueKey = 'dateValue') : (valueKey = 'blobValue');
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
  };

  public createTransaction: () => Promise<string> = async () => {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk.beginTransaction(rdsCredentials).promise();
    return result.transactionId as string;
  };

  public commitTransaction: (transactionId: string) => Promise<string> = async (transactionId: string) => {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk
      .commitTransaction({
        ...rdsCredentials,
        transactionId,
      })
      .promise();
    return result.transactionStatus as string;
  };

  public rollbackTransaction: (transactionId: string) => Promise<string> = async (transactionId: string) => {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk
      .rollbackTransaction({
        ...rdsCredentials,
        transactionId,
      })
      .promise();
    return result.transactionStatus as string;
  };

  public inTransaction: <T>(func: (transactionalDaos: IDaoCollection) => T) => Promise<T> = async (func) => {
    const transactionId = await this.createTransaction();
    try {
      const result = await func({
        Connector: this.DAO.Connector.createTransactional(transactionId),
        Integration: this.DAO.Integration.createTransactional(transactionId),
        Storage: this.DAO.Storage.createTransactional(transactionId),
        Operation: this.DAO.Operation.createTransactional(transactionId),
      });
      await this.commitTransaction(transactionId);
      return result;
    } catch (e) {
      await this.rollbackTransaction(transactionId);
      throw e;
    }
  };

  public readonly DAO: IDaoCollection = {
    Connector: new Connector(this),
    Integration: new Integration(this),
    Storage: new Storage(this),
    Operation: new Operation(this),
  };

  public ensureRecords: (
    result: AWS.RDSDataService.ExecuteStatementResponse
  ) => asserts result is AWS.RDSDataService.ExecuteStatementResponse & {
    records: NonNullable<any>;
    columnMetadata: NonNullable<any>;
  } = (result) => {
    if (!result || !result.records || result.records.length === 0 || !result.columnMetadata) {
      throw new httpError.NotFound();
    }
  };
}

const RDSSingleton: IRds = new RDS();

export default RDSSingleton;
