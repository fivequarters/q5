import * as Model from './model';
import RDS, { ensureRecords } from './rds';
import { RDSDataService } from 'aws-sdk';
import {
  defaultConstructorArguments,
  EntityConstructorArgument,
  EntityConstructorArgumentWithDefaults,
  FinalQueryOptions,
  FinalStatementOptions,
  InputQueryOptions,
  InputStatementOptions,
  MergedParameterOptions,
  MergedQueryOptions,
  MergedStatementOptions,
  EntityType,
} from './model';

//--------------------------------
// Internal
//--------------------------------

const defaultEntityConstructorArgument: defaultConstructorArguments = {
  upsert: true,
  filterExpired: true,
  prefixMatchId: false,
  listLimit: 100,
};

export abstract class Entity<ET extends Model.IEntity> {
  protected constructor(config: EntityConstructorArgument) {
    const entityConfig: EntityConstructorArgumentWithDefaults = {
      ...defaultEntityConstructorArgument,
      ...config,
    };
    this.entityType = entityConfig.entityType;
    this.defaultQueryOptions = {
      filterExpired: entityConfig.filterExpired,
      listLimit: entityConfig.listLimit,
      prefixMatchId: entityConfig.prefixMatchId,
      upsert: entityConfig.upsert,
    };
    this.defaultStatementOptions = {};
    this.defaultParameterOptions = {
      expires: entityConfig.expires,
    };
  }
  protected readonly entityType: EntityType;
  protected readonly defaultQueryOptions: MergedQueryOptions;
  protected readonly defaultStatementOptions: MergedStatementOptions;
  protected readonly defaultParameterOptions: MergedParameterOptions;
  sqlToIEntity: (record: RDSDataService.FieldList) => ET = (record) => {
    let result: ET = {
      accountId: record[1].stringValue as string,
      subscriptionId: record[2].stringValue as string,
      id: record[3].stringValue as string,
      version: record[4].longValue as number,
      data: JSON.parse(record[5].stringValue as string),
      tags: JSON.parse(record[6].stringValue as string),
    } as ET;
    if (record[7].stringValue !== undefined) {
      result.expires = new Date(record[7].stringValue as string);
    }
    return result;
  };

  protected applyDefaultsTo: <EKP extends Model.EntityKeyParams<ET>, T>(
    func: (params: EKP, queryOptions: FinalQueryOptions, statementOptions: FinalStatementOptions) => T
  ) => (params: EKP, queryOptions: InputQueryOptions, statementOptions?: InputStatementOptions) => T = <
    EKP extends Model.EntityKeyParams<ET>,
    T
  >(
    func: (params: EKP, queryOptions: FinalQueryOptions, statementOptions: FinalStatementOptions) => T
  ) => {
    return (params: EKP, queryOptions: InputQueryOptions, statementOptions: InputStatementOptions = {}) => {
      // default params set here
      const paramsWithDefaults: EKP = {
        ...this.defaultParameterOptions,
        ...params,
      };
      // default query options set here
      const queryOptionsWithDefaults: FinalQueryOptions = {
        ...this.defaultQueryOptions,
        ...queryOptions,
        listLimit: queryOptions.listLimit
          ? Math.min(queryOptions.listLimit, this.defaultQueryOptions.listLimit)
          : this.defaultQueryOptions.listLimit,
      };
      // default statement options set here
      const statementOptionsWithDefaults: FinalStatementOptions = {
        ...this.defaultStatementOptions,
        ...statementOptions,
      };
      return func(paramsWithDefaults, queryOptionsWithDefaults, statementOptionsWithDefaults);
    };
  };

  sqlToTagsWithVersion: (record: RDSDataService.FieldList) => Model.ITagsWithVersion = (record) => {
    return {
      tags: JSON.parse(record[0].stringValue as string),
      version: record[1].longValue as number,
    };
  };

  getEntity: (
    params: Model.EntityKeyGet<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions
  ) => Promise<ET> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `select * from entity
        where categoryId = :entityType
        and accountId = :accountId
        and subscriptionId = :subscriptionId
        and entityId = :entityId
        and (not :filterExpired or expires is null or expires > now());`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToIEntity(result.records[0]);
  });

  getEntityTags: (
    params: Model.EntityKeyGet<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions
  ) => Promise<Model.ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `select tags, version from entity
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (not :filterExpired or expires is null or expires > now());`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });

  listEntities: (
    params: Model.EntityKeyList<ET>,
    queryOptions: InputQueryOptions
  ) => Promise<Model.IListResponse<ET>> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `select entityId, version, tags, expires from entity
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and (:prefixMatchId and entityId like format('%s%%',:entityIdPrefix)
      and (:tags is null or tags @> :tags::jsonb))
      and (not :filterExpired or expires is null or expires > now())
      order by entityId
      offset :offset
      limit :limit + 1;`;
    const offset = params.next ? parseInt(params.next, 16) : 0;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      tags: params.tags,
      entityIdPrefix: params.idPrefix,
      prefixMatchId: queryOptions.prefixMatchId,
      filterExpired: queryOptions.filterExpired,
      offset,
      limit: queryOptions.listLimit,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    let data: Model.IListResponse<ET> = {
      items: result.records.map(this.sqlToIEntity),
    };
    // Limit of the query was set to `limit + 1` in order to grab 1 additional element.
    // This helps to determine whether there are yet more items that need to be retrieved.
    if (data.items.length === queryOptions.listLimit + 1) {
      data.items.splice(-1);
      data.next = ((offset || 0) + queryOptions.listLimit).toString(16);
    }
    return data;
  });

  deleteEntity: (
    params: Model.EntityKeyDelete<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions
  ) => Promise<boolean> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `delete from entity
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and (not :prefixMatchId or entityId = :entityId)
      and (:prefixMatchId or entityId like format('%s%%',:entityIdPrefix))
      and (not :filterExpired or expires is null or expires > now());`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      entityIdPrefix: params.idPrefix,
      prefixMatchId: queryOptions.prefixMatchId,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    return result.numberOfRecordsUpdated !== undefined && result.numberOfRecordsUpdated > 0;
  });

  createEntity: (
    params: Model.EntityKeyCreate<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions
  ) => Promise<ET> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
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
      throw new Error(`Expected exactly 1 database record inserted, got ${result.records.length}.`);
    }
    return this.sqlToIEntity(result.records[0]);
  });

  updateEntity: (
    params: Model.EntityKeyUpdate<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions
  ) => Promise<ET> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `update entity set
      data = :data::jsonb
      tags = :tags::jsonb
      expires = :expires
      version = coalesce(:version, version) + 1
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (not :filterExpired or expires is null or expires > now())
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
  });

  updateEntityTags: (
    params: Model.EntityKeyTags<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions,
    tags: Model.ITagsWithVersion
  ) => Promise<Model.ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `update entity set
      version = coalesce(:version, version) + 1
      tags = :tags::jsonb
      where categoryId = :entityId
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (not :filterExpired or expires is null or expires > now())
      and (:version is null or version = :version)
      returning tags, version;`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      version: params.version,
      tags: params.tags,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });

  setEntityTag: (
    params: Model.EntityKeyTag<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions
  ) => Promise<Model.ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `update entity set
      tags = jsonb_set(tags, format('{%s}', :tagKey), :tagValue)
      version = coalesce(:version, version) + 1
      where categoryId = :entityType
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and entityId = :entityId
      and (not :filterExpired or expires is null or expires > now())
      returning tags, version;`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      tagKey: params.tagKey,
      tagValue: params.tagValue,
      version: params.version,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });

  deleteEntityTag: (
    params: Model.EntityKeyTag<ET>,
    queryOptions: InputQueryOptions,
    statementOptions: InputStatementOptions
  ) => Promise<Model.ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
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
      tagKey: params.tagKey,
      version: params.tagValue,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await RDS.executeStatement(sql, parameters, statementOptions);
    ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });
  static readonly EntityType = EntityType;
}
export default Entity;
