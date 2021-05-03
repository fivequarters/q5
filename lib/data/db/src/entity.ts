import * as Model from './model';
import * as AWS from 'aws-sdk';
import { version } from '@babel/core';

const defaultAuroraDatabaseName = 'fusebit';
const defaultPurgeInterval = 10 * 60 * 1000;
export const defaultListLimit = 100;

let rds: AWS.RDSDataService;
let rdsCredentials: Model.IRdsCredentials;
let purgeInterval;

//--------------------------------
// General
//--------------------------------

async function purgeExpiredItems() {
  try {
    const [rds, credentials] = await ensureRds();
    const sql = `delete from entity where expires < (extract(epoch from now()) * 1000)`;
    const result = await rds
      .executeStatement({
        ...credentials,
        sql,
      })
      .promise();
    console.log('SUCCESS purging expired entities from Aurora. Purged entities:', result.numberOfRecordsUpdated);
  } catch (e) {
    console.log('ERROR purging expired entities from Aurora:', e);
  }
}

export class ConflictError extends Error {
  public statusCode = 409;
  constructor() {
    super('Conflict');
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;
  constructor() {
    super('Not found');
  }
}

export async function ensureRds(): Promise<[AWS.RDSDataService, Model.IRdsCredentials]> {
  if (!rds) {
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
    rds = new AWS.RDSDataService({
      apiVersion: '2018-08-01',
      params: {
        database: defaultAuroraDatabaseName,
      },
    });
    rdsCredentials = {
      resourceArn: dbArnTag.Value as string,
      secretArn: data.SecretList[0].ARN as string,
    };
    if (process.env.API_STACK_VERSION !== 'dev') {
      purgeInterval = setInterval(() => purgeExpiredItems(), defaultPurgeInterval).unref();
      setTimeout(() => purgeExpiredItems(), 0).unref();
    }
  }
  return [rds, rdsCredentials];
}

export async function createTransaction(): Promise<string> {
  const [rds, credentials] = await ensureRds();
  const result = await rds.beginTransaction(credentials).promise();
  return result.transactionId as string;
}

export async function commitTransaction(transactionId: string): Promise<string> {
  const [rds, credentials] = await ensureRds();
  const result = await rds
    .commitTransaction({
      ...credentials,
      transactionId,
    })
    .promise();
  return result.transactionStatus as string;
}

export async function rollbackTransaction(transactionId: string): Promise<string> {
  const [rds, credentials] = await ensureRds();
  const result = await rds
    .rollbackTransaction({
      ...credentials,
      transactionId,
    })
    .promise();
  return result.transactionStatus as string;
}

export const EntityType = {
  Integration: 1,
  Connector: 2,
  Operation: 3,
  Storage: 4,
};

//--------------------------------
// Internal
//--------------------------------

interface IQueryOptions {
  entityType: number;
  filterExpired?: boolean;
  prefixMatchId?: boolean;
  upsert?: boolean;
}

function sqlToIEntity(record: AWS.RDSDataService.FieldList): Model.IEntity {
  let result: Model.IEntity = {
    accountId: record[1].stringValue as string,
    subscriptionId: record[2].stringValue as string,
    id: record[3].stringValue as string,
    version: record[4].longValue as number,
    data: JSON.parse(record[5].stringValue as string),
    tags: JSON.parse(record[6].stringValue as string),
  };
  if (record[7].longValue !== undefined) {
    result.expires = record[7].longValue as number;
  }
  return result;
}

function sqlToTagsWithVersion(record: AWS.RDSDataService.FieldList): Model.ITagsWithVersion {
  return {
    tags: JSON.parse(record[0].stringValue as string),
    version: record[1].longValue as number,
  };
}

function escape(s: string) {
  return s.replace(/'/g, "''");
}

function primaryClause(entityType: number, params: { accountId: string; subscriptionId: string }) {
  return `where categoryId=${entityType} 
    and accountId='${escape(params.accountId)}' 
    and subscriptionId='${escape(params.subscriptionId)}'`;
}

function expiredClause(filterExpired?: boolean) {
  return `${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}`;
}

function idClause(id: string) {
  return `and entityId = '${escape(id)}'`;
}

export async function getEntity(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey
): Promise<Model.IEntity> {
  const [rds, credentials] = await ensureRds();
  const sql = `select * from entity 
    ${primaryClause(entityType, params)}
    and entityId='${escape(params.id)}'
    ${expiredClause(filterExpired)}`;
  const result = await rds
    .executeStatement({
      ...credentials,
      sql,
    })
    .promise();
  if (!result || !result.records || result.records.length === 0) {
    throw new NotFoundError();
  }
  if (result.records.length > 1) {
    throw new Error(`Expected exactly 1 matching database record, got ${result.records.length}.`);
  }
  return sqlToIEntity(result.records[0]);
}

export async function getEntityTags(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey
): Promise<Model.ITagsWithVersion> {
  const [rds, credentials] = await ensureRds();
  const sql = `select tags, version from entity 
    ${primaryClause(entityType, params)}
    ${idClause(params.id)}
    ${expiredClause(filterExpired)}`;
  const result = await rds
    .executeStatement({
      ...credentials,
      sql,
    })
    .promise();
  if (!result || !result.records || result.records.length === 0) {
    throw new NotFoundError();
  }
  if (result.records.length > 1) {
    throw new Error(`Expected exactly 1 matching database record, got ${result.records.length}.`);
  }
  return sqlToTagsWithVersion(result.records[0]);
}

export async function listEntities(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IListRequest
): Promise<Model.IListResponse> {
  const [rds, credentials] = await ensureRds();
  const limit = Math.min(Math.max(params.limit || defaultListLimit, 1), defaultListLimit);
  const offset = (params.next && parseInt(params.next, 16)) || undefined;
  const sql = `select entityId, version, tags, expires from entity 
    ${primaryClause(entityType, params)}
    ${params.idPrefix ? `and entityId like '${escape(params.idPrefix)}%'` : ''}
    ${params.tags ? `and tags @> '${escape(JSON.stringify(params.tags))}'::jsonb` : ''}
    ${expiredClause(filterExpired)}
    order by entityId
    ${offset ? `offset ${offset}` : ''}
    limit ${limit + 1}`;
  const result = await rds
    .executeStatement({
      ...credentials,
      sql,
    })
    .promise();
  if (!result || !result.records) {
    throw new Error('Unable to list entities');
  }
  let data: Model.IListResponse = {
    items: result.records.map((r) => ({
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: r[0].stringValue as string,
      version: r[1].longValue as number,
      tags: JSON.parse(r[2].stringValue as string) as Model.ITags,
      ...(r[3].longValue === undefined ? {} : { expires: r[3].longValue as number }),
    })),
  };
  if (data.items.length > limit) {
    data.items.splice(-1);
    data.next = ((offset || 0) + data.items.length).toString(16);
  }
  return data;
}

export async function deleteEntity(
  { entityType, filterExpired, prefixMatchId }: IQueryOptions,
  params: Model.IEntityKey,
  options?: Model.IStatementOptions
): Promise<boolean> {
  const [rds, credentials] = await ensureRds();
  const sql = `delete from entity 
    ${primaryClause(entityType, params)}
    and ${prefixMatchId ? `entityId like '${escape(params.id)}%'` : `entityId='${escape(params.id)}'`}
    ${expiredClause(filterExpired)}`;
  const result = await rds
    .executeStatement({
      ...credentials,
      ...options,
      sql,
    })
    .promise();
  return result.numberOfRecordsUpdated !== undefined && result.numberOfRecordsUpdated > 0;
}

export async function createEntity(
  { entityType, upsert }: IQueryOptions,
  params: Model.IEntity,
  options?: Model.IStatementOptions
): Promise<Model.IEntity> {
  const [rds, credentials] = await ensureRds();
  let upsertClause = '';
  if (upsert) {
    upsertClause = `on conflict on constraint entity_pri_key do update set  
      data = '${escape(JSON.stringify(params.data))}'::jsonb,
      tags = '${escape(JSON.stringify(params.tags))}'::jsonb,
      expires = ${params.expires !== undefined ? params.expires : 'null'},
      version = ${params.version === undefined ? 'entity.version + 1' : params.version + 1}`;
  }
  const sql = `insert into entity values (
    ${entityType},
    '${escape(params.accountId)}',
    '${escape(params.subscriptionId)}',
    '${escape(params.id)}',
    1,
    '${escape(JSON.stringify(params.data))}'::jsonb,
    '${escape(JSON.stringify(params.tags))}'::jsonb,
    ${params.expires !== undefined ? params.expires : 'null'})
    ${upsertClause}
    returning *;`;
  let result;
  try {
    result = await rds
      .executeStatement({
        ...credentials,
        ...options,
        sql,
      })
      .promise();
  } catch (e) {
    throw e.message.match(/version_conflict/) ? new ConflictError() : e;
  }
  if (upsert) {
    if (!result || !result.records || result.records.length > 1) {
      throw new Error(
        `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
      );
    }
    if (result.records.length === 0) {
      throw new NotFoundError();
    }
  } else if (!result || !result.records || result.records.length !== 1) {
    throw new Error(
      `Expected exactly 1 database record inserted, got ${result && result.records ? result.records.length : 'N/A'}.`
    );
  }
  return sqlToIEntity(result.records[0]);
}

export async function updateEntity(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntity,
  options?: Model.IStatementOptions
): Promise<Model.IEntity | undefined> {
  const [rds, credentials] = await ensureRds();
  let result;
  try {
    result = await rds
      .executeStatement({
        ...credentials,
        ...options,
        sql: `update entity set
        data = '${escape(JSON.stringify(params.data))}'::jsonb,
        tags = '${escape(JSON.stringify(params.tags))}'::jsonb,
        expires = ${params.expires === undefined ? 'null' : params.expires},
        version = ${params.version === undefined ? 'version + 1' : params.version + 1}
        ${primaryClause(entityType, params)}
        ${idClause(params.id)}
        ${expiredClause(filterExpired)}
        returning *;`,
      })
      .promise();
  } catch (e) {
    throw e.message.match(/version_conflict/) ? new ConflictError() : e;
  }
  if (!result || !result.records || result.records.length > 1) {
    throw new Error(
      `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
    );
  }
  if (result.records.length === 0) {
    throw new NotFoundError();
  }
  return sqlToIEntity(result.records[0]);
}

export async function updateEntityTags(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey,
  tags: Model.ITagsWithVersion,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion> {
  const [rds, credentials] = await ensureRds();
  let result;
  try {
    result = await rds
      .executeStatement({
        ...credentials,
        ...options,
        sql: `update entity set
        tags = '${escape(JSON.stringify(tags.tags))}'::jsonb,
        version = ${tags.version === undefined ? 'version + 1' : tags.version + 1}
        ${primaryClause(entityType, params)}
        ${idClause(params.id)}
        ${expiredClause(filterExpired)}
        returning tags, version;`,
      })
      .promise();
  } catch (e) {
    throw e.message.match(/version_conflict/) ? new ConflictError() : e;
  }
  if (!result || !result.records || result.records.length > 1) {
    throw new Error(
      `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
    );
  }
  if (result.records.length === 0) {
    throw new NotFoundError();
  }
  return sqlToTagsWithVersion(result.records[0]);
}

export async function setEntityTag(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey,
  key: string,
  value?: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion> {
  const [rds, credentials] = await ensureRds();
  const sql = `update entity set
    tags = ${
      value !== undefined ? `jsonb_set(tags, '{${escape(key)}}', '"${escape(value)}"')` : `tags - '${escape(key)}'`
    },
    version = ${version === undefined ? 'version + 1' : version + 1}
    ${primaryClause(entityType, params)}
    ${idClause(params.id)}
    ${expiredClause(filterExpired)}
    returning tags, version;`;
  let result;
  try {
    result = await rds
      .executeStatement({
        ...credentials,
        ...options,
        sql,
      })
      .promise();
  } catch (e) {
    throw e.message.match(/version_conflict/) ? new ConflictError() : e;
  }
  if (!result || !result.records || result.records.length > 1) {
    throw new Error(
      `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
    );
  }
  if (result.records.length === 0) {
    throw new NotFoundError();
  }
  return sqlToTagsWithVersion(result.records[0]);
}
