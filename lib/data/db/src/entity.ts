import * as Model from './model';
import RDS from './rds';
import { RDSDataService } from 'aws-sdk';
import { IStatementOptions } from './model';

//--------------------------------
// Internal
//--------------------------------

export abstract class Entity<EntityType extends Model.IEntity> {
  protected abstract readonly entityType: Entity.EntityType;

  protected defaultListLimit = 100;
  sqlToIEntity: (record: RDSDataService.FieldList) => EntityType = (record) => {
    let result: EntityType = {
      accountId: record[1].stringValue as string,
      subscriptionId: record[2].stringValue as string,
      id: record[3].stringValue as string,
      version: record[4].longValue as number,
      data: JSON.parse(record[5].stringValue as string),
      tags: JSON.parse(record[6].stringValue as string),
    } as EntityType;
    if (record[7].longValue !== undefined) {
      result.expires = record[7].longValue as number;
    }
    return result;
  };

  sqlToTagsWithVersion: (record: RDSDataService.FieldList) => Model.ITagsWithVersion = (record) => {
    return {
      tags: JSON.parse(record[0].stringValue as string),
      version: record[1].longValue as number,
    };
  };

  escape: (s: string) => string = (s) => {
    return s.replace(/'/g, "''");
  };

  primaryClause: (entityType: number, params: { accountId: string; subscriptionId: string }) => string = (
    entityType,
    params
  ) => {
    return `where categoryId=${entityType} 
    and accountId='${escape(params.accountId)}' 
    and subscriptionId='${escape(params.subscriptionId)}'`;
  };

  expiredClause: (filterExpired?: boolean) => string = (filterExpired) => {
    return `${filterExpired ? `and (expires is null or expires > ${Date.now()})` : ''}`;
  };

  versionClause: (version?: number) => string = (version) => {
    return `${version !== undefined ? `and version = ${version}` : ''}`;
  };

  idClause: (id: string) => string = (id) => {
    return `and entityId = '${escape(id)}'`;
  };

  getEntity: (params: Model.IEntityKey, { filterExpired }: IQueryOptions) => Promise<EntityType | undefined> = async (
    params,
    options = {}
  ) => {
    const { rdsSdk, rdsCredentials } = await RDS.ensureConnection();
    const sql = `select * from entity 
    ${this.primaryClause(this.entityType, params)}
    and entityId='${escape(params.id)}'
    ${this.expiredClause(options.filterExpired)}`;
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
        sql,
      })
      .promise();
    if (!result || !result.records || result.records.length === 0) {
      return undefined;
    }
    if (result.records.length > 1) {
      throw new Error(`Expected exactly 1 matching database record, got ${result.records.length}.`);
    }
    return this.sqlToIEntity(result.records[0]);
  };

  getEntityTags: (
    params: Model.IEntityKey,
    { filterExpired }: IQueryOptions
  ) => Promise<Model.ITagsWithVersion | undefined> = async (params, options = {}) => {
    const { rdsSdk, rdsCredentials } = await RDS.ensureConnection();
    const sql = `select tags, version from entity 
    ${this.primaryClause(this.entityType, params)}
    ${this.idClause(params.id)}
    ${this.expiredClause(options.filterExpired)}`;
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
        sql,
      })
      .promise();
    if (!result || !result.records || result.records.length === 0) {
      return undefined;
    }
    if (result.records.length > 1) {
      throw new Error(`Expected exactly 1 matching database record, got ${result.records.length}.`);
    }
    return this.sqlToTagsWithVersion(result.records[0]);
  };

  listEntities: (params: Model.IListRequest, { filterExpired }: IQueryOptions) => Promise<Model.IListResponse> = async (
    params,
    options = {}
  ) => {
    const { rdsSdk, rdsCredentials } = await RDS.ensureConnection();
    const limit = Math.min(Math.max(params.limit || this.defaultListLimit, 1), this.defaultListLimit);
    const offset = (params.next && parseInt(params.next, 16)) || undefined;
    const sql = `select entityId, version, tags, expires from entity 
    ${this.primaryClause(this.entityType, params)}
    ${params.idPrefix ? `and entityId like '${escape(params.idPrefix)}%'` : ''}
    ${params.tags ? `and tags @> '${escape(JSON.stringify(params.tags))}'::jsonb` : ''}
    ${this.expiredClause(options.filterExpired)}
    order by entityId
    ${offset ? `offset ${offset}` : ''}
    limit ${limit + 1}`;
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
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
  };

  deleteEntity: (
    params: Model.IEntityKey,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<boolean> = async (params, options = {}) => {
    const { rdsSdk, rdsCredentials } = await RDS.ensureConnection();
    const sql = `delete from entity 
    ${this.primaryClause(this.entityType, params)}
    and ${options.prefixMatchId ? `entityId like '${escape(params.id)}%'` : `entityId='${escape(params.id)}'`}
    ${this.expiredClause(options.filterExpired)}`;
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
        ...options,
        sql,
      })
      .promise();
    return result.numberOfRecordsUpdated !== undefined && result.numberOfRecordsUpdated > 0;
  };

  createEntity: (
    params: EntityType,
    queryOptions: IQueryOptions,
    statementOptions: IStatementOptions
  ) => Promise<EntityType | undefined> = async (params, queryOptions = {}, statementOptions = {}) => {
    const { rdsCredentials, rdsSdk } = await RDS.ensureConnection();
    let upsertClause = '';
    if (queryOptions.upsert) {
      upsertClause = `on conflict on constraint entity_pri_key do update set  
      data = '${escape(JSON.stringify(params.data))}'::jsonb,
      tags = '${escape(JSON.stringify(params.tags))}'::jsonb,
      expires = ${params.expires !== undefined ? params.expires : 'null'},
      version = entity.version + 1
      ${params.version !== undefined ? `where entity.version = ${params.version}` : ''}`;
    }
    const sql = `insert into entity values (
    ${this.entityType},
    '${escape(params.accountId)}',
    '${escape(params.subscriptionId)}',
    '${escape(params.id)}',
    1,
    '${escape(JSON.stringify(params.data))}'::jsonb,
    '${escape(JSON.stringify(params.tags))}'::jsonb,
    ${params.expires !== undefined ? params.expires : 'null'})
    ${upsertClause}
    returning *;`;
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
        ...statementOptions,
        sql,
      })
      .promise();
    if (queryOptions.upsert) {
      if (!result || !result.records || result.records.length > 1) {
        throw new Error(
          `Expected zero or one database record updated, got ${
            result && result.records ? result.records.length : 'N/A'
          }.`
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
    return this.sqlToIEntity(result.records[0]);
  };

  updateEntity: (
    params: EntityType,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<EntityType | undefined> = async (params, queryOptions = {}, statementOptions = {}) => {
    const { rdsCredentials, rdsSdk } = await RDS.ensureConnection();
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
        ...statementOptions,
        sql: `update entity set
        data = '${escape(JSON.stringify(params.data))}'::jsonb,
        tags = '${escape(JSON.stringify(params.tags))}'::jsonb,
        expires = ${params.expires !== undefined ? params.expires : 'null'},
        version = version + 1
        ${this.primaryClause(this.entityType, params)}
        ${this.idClause(params.id)}
        ${this.versionClause(params.version)}
        ${this.expiredClause(queryOptions.filterExpired)}
        returning *;`,
      })
      .promise();
    if (!result || !result.records || result.records.length > 1) {
      throw new Error(
        `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
      );
    }
    return result.records.length === 0 ? undefined : this.sqlToIEntity(result.records[0]);
  };

  updateEntityTags: (
    params: Model.IEntityKey,
    tags: Model.ITagsWithVersion,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<Model.ITagsWithVersion | undefined> = async (params, tags, queryOptions = {}, statementOptions = {}) => {
    const { rdsCredentials, rdsSdk } = await RDS.ensureConnection();
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
        ...statementOptions,
        sql: `update entity set
        tags = '${escape(JSON.stringify(tags.tags))}'::jsonb,
        version = version + 1
        ${this.primaryClause(this.entityType, params)}
        ${this.idClause(params.id)}
        ${this.versionClause(tags.version)}
        ${this.expiredClause(queryOptions.filterExpired)}
        returning tags, version;`,
      })
      .promise();
    if (!result || !result.records || result.records.length > 1) {
      throw new Error(
        `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
      );
    }
    return result.records.length === 0 ? undefined : this.sqlToTagsWithVersion(result.records[0]);
  };

  setEntityTag: (
    params: Model.IEntityKey,
    tagParams: ITagParams,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<Model.ITagsWithVersion | undefined> = async (params, tagParams, queryOptions, statementOptions) => {
    const { rdsCredentials, rdsSdk } = await RDS.ensureConnection();
    const sql = `update entity set
    tags = ${
      tagParams.value !== undefined
        ? `jsonb_set(tags, '{${escape(tagParams.key)}}', '"${escape(tagParams.value)}"')`
        : `tags - '${escape(tagParams.key)}'`
    },
    version = version + 1
    ${this.primaryClause(this.entityType, params)}
    ${this.idClause(params.id)}
    ${this.versionClause(tagParams.version)}
    ${this.expiredClause(queryOptions.filterExpired)}
    returning tags, version;`;
    const result = await rdsSdk
      .executeStatement({
        ...rdsCredentials,
        ...statementOptions,
        sql,
      })
      .promise();
    if (!result || !result.records || result.records.length > 1) {
      throw new Error(
        `Expected zero or one database record updated, got ${result && result.records ? result.records.length : 'N/A'}.`
      );
    }
    return result.records.length === 0 ? undefined : this.sqlToTagsWithVersion(result.records[0]);
  };
}

interface IQueryOptions {
  filterExpired?: boolean;
  prefixMatchId?: boolean;
  upsert?: boolean;
}

interface ITagParams {
  key: string;
  value?: string;
  version?: number;
}

export namespace Entity {
  export enum EntityType {
    Integration,
    Connector,
    Operation,
    Storage,
  }
}

export default Entity;
