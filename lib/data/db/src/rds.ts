import * as AWS from 'aws-sdk';
import * as Model from './model';
import { RDSDataService } from 'aws-sdk';
import { SqlRecords } from 'aws-sdk/clients/rdsdataservice';
import { PromiseResult } from 'aws-sdk/lib/request';

class RDS {
  NotFoundError = class extends Error {
    public statusCode = 404;
    constructor() {
      super('Not found');
    }
  };
  ConflictError = class extends Error {
    public statusCode = 409;
    constructor() {
      super('Conflict');
    }
  };

  private rdsSdk!: AWS.RDSDataService;
  private rdsCredentials!: Model.IRdsCredentials;
  private purgeInterval!: NodeJS.Timeout;
  private readonly defaultAuroraDatabaseName = 'fusebit';
  private readonly defaultPurgeInterval = 10 * 60 * 1000;

  purgeExpiredItems = async () => {
    try {
      const { rdsSdk, rdsCredentials } = await this.ensureConnection();
      const sql = `delete from entity where expires < (extract(epoch from now()) * 1000)`;
      const result = await rdsSdk
        .executeStatement({
          ...rdsCredentials,
          sql,
        })
        .promise();
      console.log('SUCCESS purging expired entities from Aurora. Purged entities:', result.numberOfRecordsUpdated);
    } catch (e) {
      console.log('ERROR purging expired entities from Aurora:', e);
    }
  };

  ensureConnection: () => Promise<{ rdsSdk: AWS.RDSDataService; rdsCredentials: Model.IRdsCredentials }> = async () => {
    if (!this.rdsSdk) {
      const secretsmanager = new AWS.SecretsManager({
        apiVersion: '2017-10-17',
      });
      const params = {
        Filters: [
          { Key: 'tag-key', Values: ['fusebitDeployment'] },
          { Key: 'tag-value', Values: [process.env.DEPLOYMENT_KEY as string] },
        ],
      };
      const data = await secretsmanager.listSecrets(params).promise();
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

  executeStatement: (
    sql: string,
    objectParameters?: { [key: string]: any },
    statementOptions?: Model.IStatementOptions
  ) => Promise<PromiseResult<RDSDataService.ExecuteStatementResponse, AWS.AWSError>> = async (
    sql,
    objectParameters = {},
    statementOptions = {}
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
        })
        .promise();
    } catch (e) {
      throw e.message.match(/version_conflict/) ? new this.ConflictError() : e;
    }
  };

  createParameterArray: (parameters: { [key: string]: any }) => RDSDataService.SqlParametersList = (parameters) => {
    return Object.keys(parameters).map((key) => {
      let valueKey;
      let value = parameters[key];
      switch (typeof value) {
        case 'object':
          if (value instanceof Date) {
            valueKey = 'dateValue';
          } else {
            valueKey = 'blobValue';
          }
          break;
        case 'string':
          valueKey = 'stringValue';
          break;
        case 'boolean':
          valueKey = 'booleanValue';
          break;
        case 'number':
          if ((value as number) % 1 === 0) {
            valueKey = 'longValue';
          } else {
            valueKey = 'doubleValue';
          }
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

  createTransaction: () => Promise<string> = async () => {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk.beginTransaction(rdsCredentials).promise();
    return result.transactionId as string;
  };

  commitTransaction: (transactionId: string) => Promise<string> = async (transactionId: string) => {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk
      .commitTransaction({
        ...rdsCredentials,
        transactionId,
      })
      .promise();
    return result.transactionStatus as string;
  };

  rollbackTransaction: (transactionId: string) => Promise<string> = async (transactionId: string) => {
    const { rdsSdk, rdsCredentials } = await this.ensureConnection();
    const result = await rdsSdk
      .rollbackTransaction({
        ...rdsCredentials,
        transactionId,
      })
      .promise();
    return result.transactionStatus as string;
  };

  inTransaction: <T>(func: () => Promise<T> | T) => Promise<T> = async (func) => {
    const transactionId = await this.createTransaction();
    try {
      const result = await func();
      await this.commitTransaction(transactionId);
      return result;
    } catch (e) {
      await this.rollbackTransaction(transactionId);
      throw e;
    }
  };
}

const RDSSingleton = new RDS();

export default RDSSingleton;

export const ensureRecords: (
  result: RDSDataService.ExecuteStatementResponse
) => asserts result is RDSDataService.ExecuteStatementResponse & { records: SqlRecords } = (result) => {
  if (!result || !result.records || result.records.length === 0) {
    throw new RDSSingleton.NotFoundError();
  }
};
