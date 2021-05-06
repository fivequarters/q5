import * as Model from './model';
import RDS, { ensureRecords } from './rds';
import { RDSDataService } from 'aws-sdk';
import { IQueryOptions, IStatementOptions, ITagParams } from './model';

//--------------------------------
// Internal
//--------------------------------

export abstract class Entity<ET extends Model.IEntity> {
  protected abstract readonly entityType: Entity.EntityType;

  protected defaultListLimit = 100;
  sqlToIEntity: (record: RDSDataService.FieldList) => ET = (record) => {
    let result: ET = {
      accountId: record[1].stringValue as string,
      subscriptionId: record[2].stringValue as string,
      id: record[3].stringValue as string,
      version: record[4].longValue as number,
      data: JSON.parse(record[5].stringValue as string),
      tags: JSON.parse(record[6].stringValue as string),
    } as ET;
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

  getEntity: (params: Model.IEntityKey, { filterExpired }: IQueryOptions) => Promise<ET> = async (
    params,
    options = {}
  ) => {
    const sql = `select * from entity
        where categoryId = :entityType
        and accountId = :accountId
        and subscriptionId = :subscriptionId
        and entityId = :entityId
        and (:filterExpired is null or expires is null or expires > now());`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: options.filterExpired,
    };
    const result = await RDS.executeStatement(sql, parameters);
    if (!result || !result.records || result.records.length === 0) {
      throw new RDS.NotFoundError();
    }
    if (result.records.length > 1) {
      throw new Error(`Expected exactly 1 matching database record, got ${result.records.length}.`);
    }
    return this.sqlToIEntity(result.records[0]);
  };

  getEntityTags: (
    params: Model.IEntityKey,
    { filterExpired }: IQueryOptions
  ) => Promise<Model.ITagsWithVersion> = async (params, options = {}) => {
    const sql = `select tags, version from entity
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (:filterExpired is null or expires is null or expires > now());`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: options.filterExpired,
    };

    const result = await RDS.executeStatement(sql, parameters);
    ensureRecords(result);
    if (result.records.length > 1) {
      throw new Error(`Expected exactly 1 matching database record, got ${result.records.length}.`);
    }
    return this.sqlToTagsWithVersion(result.records[0]);
  };

  listEntities: (params: Model.IListRequest, options: IQueryOptions) => Promise<Model.IListResponse> = async (
    params,
    options = {}
  ) => {
    const sql = `select entityId, version, tags, expires from entity
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and (:entityIdPrefix is null or entityId like format('%s%%',:entityIdPrefix)
      and (:tags is null or tags @> :tags::jsonb))
      and (:filterExpired is null or expires is null or expires > now())
      order by entityId
      offset coalesce(:offset, 0)
      limit coalesce(:limit, 1);`;
    const limit = Math.min(Math.max(params.limit || this.defaultListLimit, 1), this.defaultListLimit);
    const offset = (params.next && parseInt(params.next, 16)) || undefined;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityIdPrefix: options.prefixMatchId,
      tags: params.tags,
      filterExpired: options.filterExpired,
      offset,
      limit,
    };
    const result = await RDS.executeStatement(sql, parameters);
    ensureRecords(result);
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
  ) => Promise<boolean> = async (params, queryOptions = {}, statementOptions) => {
    const sql = `delete from entity
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and (:entityId is null or entityId = :entityId)
      and (:entityIdPrefix is null or entityId like format('%s%%',:entityIdPrefix))
      and (:filterExpired is null or expires is null or expires > now());`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      entityIdPrefix: queryOptions.prefixMatchId,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    return result.numberOfRecordsUpdated !== undefined && result.numberOfRecordsUpdated > 0;
  };

  createEntity: (params: ET, queryOptions: IQueryOptions, statementOptions: IStatementOptions) => Promise<ET> = async (
    params,
    queryOptions = {},
    statementOptions = {}
  ) => {
    const sql = `insert into entity values (
        :entityType,
        :accountId,
        :subscriptionId,
        :entityId,
        1,
        :data::jsonb,
        :tags::jsonb,
        :expires
      )
      returning *;`;

    const sqlUpsert = `insert into entity values (
        :entityType,
        :accountId,
        :subscriptionId,
        :entityId,
        1,
        :data::jsonb,
        :tags::jsonb,
        :expires
      )
      on conflict on constraint entity_pri_key do
      update set
      data = :data::jsonb
      tags = :tags::jsonb
      expires = :expires
      version = coalesce(:version, version) + 1
      returning *;`;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      data: JSON.stringify(params.data),
      tags: JSON.stringify(params.data),
      expires: params.expires,
      version: params.version,
    };

    let selectedInsert;
    if (queryOptions.upsert) {
      selectedInsert = sqlUpsert;
    } else {
      selectedInsert = sql;
    }
    const result = await RDS.executeStatement(selectedInsert, parameters, statementOptions);

    ensureRecords(result);
    if (result.records.length !== 1) {
      throw new Error(
        `Expected exactly 1 database record inserted, got ${result && result.records ? result.records.length : 'N/A'}.`
      );
    }
    return this.sqlToIEntity(result.records[0]);
  };

  updateEntity: (
    params: ET,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<ET> = async (params, queryOptions = {}, statementOptions = {}) => {
    const sql = `update entity set
      data = :data::jsonb
      tags = :tags::jsonb
      expires = :expires
      version = coalesce(:version, version) + 1
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (:filterExpired is null or expires is null or expires > now())
      returning *`;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
      data: params.data,
      tags: params.tags,
      expires: params.expires,
      version: params.version,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToIEntity(result.records[0]);
  };

  updateEntityTags: (
    params: Model.IEntityKey,
    tags: Model.ITagsWithVersion,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<Model.ITagsWithVersion> = async (params, tags, queryOptions = {}, statementOptions = {}) => {
    const sql = `update entity set
      version = coalesce(:version, version) + 1
      tags = :tags::jsonb
      where categoryId = :entityId
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (:filterExpired is null or expires is null or expires > now())
      and (:version is null or version = :version)
      returning tags, version;`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
      version: tags.version,
      tags: tags.tags,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  };

  setEntityTag: (
    params: Model.IEntityKey,
    tagParams: ITagParams,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<Model.ITagsWithVersion> = async (params, tagParams, queryOptions, statementOptions) => {
    const sql = `update entity set
      tags = jsonb_set(tags, format('{%s}', :tagKey), :tagValue)
      version = coalesce(:version, version) + 1
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (:filterExpired is null or expires is null or expires > now())
      returning tags, version;`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
      tagKey: tagParams.key,
      tagValue: tagParams.value,
      version: tagParams.version,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  };

  deleteEntityTag: (
    params: Model.IEntityKey,
    tagParams: ITagParams,
    queryOptions: IQueryOptions,
    statementOptions: Model.IStatementOptions
  ) => Promise<Model.ITagsWithVersion> = async (params, tagParams, queryOptions, statementOptions) => {
    const sql = `update entity set
      tags = tags - :tagKey
      version = coalesce(:version, version) + 1
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (:filterExpired is null or expires is null or expires > now())
      returning tags, version;`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
      tagKey: tagParams.key,
      version: tagParams.version,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  };
}

export namespace Entity {
  export enum EntityType {
    Integration = 'integration',
    Connector = 'connector',
    Operation = 'operation',
    Storage = 'storage',
  }
}

export default Entity;
