import * as Model from './model';
import * as AWS from 'aws-sdk';

const defaultAuroraDatabaseName = 'fusebit';
const defaultPurgeInterval = 10 * 60 * 1000;

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
  Identity: 3,
  IntegrationIntance: 4,
  Operation: 5,
  Storage: 6,
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

function sqlToIEntity(record: any): Model.IEntity {
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

function sqlToTagsWithVersion(record: any): Model.ITagsWithVersion {
  return {
    tags: JSON.parse(record[0].stringValue as string),
    version: record[1].longValue as number,
  };
}

export async function getEntity(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey
): Promise<Model.IEntity | undefined> {
  const [rds, credentials] = await ensureRds();
  const sql = `select * from entity 
    where categoryId=${entityType} 
    and accountId='${params.accountId}' 
    and subscriptionId='${params.subscriptionId}'
    and entityId='${params.id}'
    ${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}`;
  const result = await rds
    .executeStatement({
      ...credentials,
      sql,
    })
    .promise();
  if (!result || !result.records || result.records.length === 0) {
    return undefined;
  }
  if (result.records.length > 1) {
    throw new Error(`Expected exactly 1 matching database record, got ${result.records.length}.`);
  }
  return sqlToIEntity(result.records[0]);
}

export async function getEntityTags(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey
): Promise<Model.ITagsWithVersion | undefined> {
  const [rds, credentials] = await ensureRds();
  const sql = `select tags, version from entity 
    where categoryId=${entityType} 
    and accountId='${params.accountId}' 
    and subscriptionId='${params.subscriptionId}'
    and entityId='${params.id}'
    ${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}`;
  const result = await rds
    .executeStatement({
      ...credentials,
      sql,
    })
    .promise();
  if (!result || !result.records || result.records.length === 0) {
    return undefined;
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
  const limit = Math.min(Math.max(params.limit || 100, 1), 100);
  const offset = (params.next && parseInt(params.next, 16)) || undefined;
  const sql = `select entityId, version, tags, expires from entity 
    where categoryId=${entityType} 
    and accountId='${params.accountId}' 
    and subscriptionId='${params.subscriptionId}'
    ${params.idPrefix ? `and entityId like '${params.idPrefix}%'` : ''}
    ${params.tags ? `and tags @> '${JSON.stringify(params.tags)}'::jsonb` : ''}
    ${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}
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
    where categoryId=${entityType} 
    and accountId='${params.accountId}' 
    and subscriptionId='${params.subscriptionId}'
    and ${prefixMatchId ? `entityId like '${params.id}%'` : `entityId='${params.id}'`}
    ${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}`;
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
): Promise<Model.IEntity | undefined> {
  const [rds, credentials] = await ensureRds();
  let upsertClause = '';
  if (upsert) {
    upsertClause = `on conflict on constraint entity_pri_key do update set  
      data = '${JSON.stringify(params.data)}'::jsonb,
      tags = '${JSON.stringify(params.tags)}'::jsonb,
      expires = ${params.expires !== undefined ? params.expires : 'null'},
      version = entity.version + 1
      ${params.version !== undefined ? `where entity.version = ${params.version}` : ''}`;
  }
  const sql = `insert into entity values (
    ${entityType},
    '${params.accountId}',
    '${params.subscriptionId}',
    '${params.id}',
    1,
    '${JSON.stringify(params.data)}'::jsonb,
    '${JSON.stringify(params.tags)}'::jsonb,
    ${params.expires !== undefined ? params.expires : 'null'})
    ${upsertClause}
    returning *;`;
  const result = await rds
    .executeStatement({
      ...credentials,
      ...options,
      sql,
    })
    .promise();
  if (upsert) {
    if (!result || !result.records || result.records.length > 1) {
      throw new Error(
        `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
      );
    }
    if (result.records.length === 0) {
      return undefined;
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
  const result = await rds
    .executeStatement({
      ...credentials,
      ...options,
      sql: `update entity set
        data = '${JSON.stringify(params.data)}'::jsonb,
        tags = '${JSON.stringify(params.tags)}'::jsonb,
        expires = ${params.expires !== undefined ? params.expires : 'null'},
        version = version + 1
        where categoryId = ${entityType}
        and accountId = '${params.accountId}'
        and subscriptionId = '${params.subscriptionId}'
        and entityId = '${params.id}'
        ${params.version !== undefined ? `and version = ${params.version}` : ''}
        ${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}
        returning *;`,
    })
    .promise();
  if (!result || !result.records || result.records.length > 1) {
    throw new Error(
      `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
    );
  }
  return result.records.length === 0 ? undefined : sqlToIEntity(result.records[0]);
}

export async function updateEntityTags(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey,
  tags: Model.ITagsWithVersion,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  const [rds, credentials] = await ensureRds();
  const result = await rds
    .executeStatement({
      ...credentials,
      ...options,
      sql: `update entity set
        tags = '${JSON.stringify(tags.tags)}'::jsonb,
        version = version + 1
        where categoryId = ${entityType}
        and accountId = '${params.accountId}'
        and subscriptionId = '${params.subscriptionId}'
        and entityId = '${params.id}'
        ${tags.version !== undefined ? `and version = ${tags.version}` : ''}
        ${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}
        returning tags, version;`,
    })
    .promise();
  if (!result || !result.records || result.records.length > 1) {
    throw new Error(
      `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
    );
  }
  return result.records.length === 0 ? undefined : sqlToTagsWithVersion(result.records[0]);
}

export async function setEntityTag(
  { entityType, filterExpired }: IQueryOptions,
  params: Model.IEntityKey,
  key: string,
  value?: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  const [rds, credentials] = await ensureRds();
  const sql = `update entity set
    tags = ${value !== undefined ? `jsonb_set(tags, '{${key}}', '"${value}"')` : `tags - '${key}'`},
    version = version + 1
    where categoryId = ${entityType}
    and accountId = '${params.accountId}'
    and subscriptionId = '${params.subscriptionId}'
    and entityId = '${params.id}'
    ${version !== undefined ? `and version = ${version}` : ''}
    ${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}
    returning tags, version;`;
  const result = await rds
    .executeStatement({
      ...credentials,
      ...options,
      sql,
    })
    .promise();
  if (!result || !result.records || result.records.length > 1) {
    throw new Error(
      `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
    );
  }
  return result.records.length === 0 ? undefined : sqlToTagsWithVersion(result.records[0]);
}
