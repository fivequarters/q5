import { RDSDataService } from 'aws-sdk';
import moment from 'moment';
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
  ITagsWithVersion,
  EntityKeyGet,
  IEntity,
  EntityKeyParams,
  EntityKeyTags,
  EntityKeyList,
  IListResponse,
  EntityKeyDelete,
  EntityKeyCreate,
  EntityKeyUpdate,
  EntityKeyTagSet,
  IEntityDao,
  IRds,
} from '../model';

//--------------------------------
// Internal
//--------------------------------

const defaultEntityConstructorArgument: defaultConstructorArguments = {
  upsert: true,
  filterExpired: true,
  prefixMatchId: false,
  listLimit: 100,
};

export abstract class Entity<ET extends IEntity> implements IEntityDao<ET> {
  // private readonly passToTransactional: <E extends Entity<ET>>(
  //   construct: EntityDao<ET>,
  //   transactionalId: string
  // ) => IEntityDao<ET> = (construct: EntityDao<ET>, transactionalId) => {
  //   return new construct(this.RDS, transactionalId);
  // };

  public readonly createTransactional: (transactionId?: string) => this = (transactionId) => {
    return Reflect.construct(this.constructor, [this.RDS, transactionId]);
  };

  protected constructor(config: EntityConstructorArgument) {
    this.RDS = config.RDS;
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
    this.defaultStatementOptions = {
      transactionId: config.transactionId,
    };
    this.defaultParameterOptions = {
      expires: entityConfig.expires,
      expiresDuration: entityConfig.expiresDuration,
    };
  }
  protected readonly RDS: IRds;
  protected readonly entityType: EntityType;
  protected readonly defaultQueryOptions: MergedQueryOptions;
  protected readonly defaultStatementOptions: MergedStatementOptions;
  protected readonly defaultParameterOptions: MergedParameterOptions;

  sqlToIEntity: (record: RDSDataService.FieldList) => ET = (record) => {
    let result: ET = {
      accountId: record[2].stringValue as string,
      subscriptionId: record[3].stringValue as string,
      id: record[4].stringValue as string,
      version: record[5].longValue as number,
      data: JSON.parse(record[6].stringValue as string),
      tags: JSON.parse(record[7].stringValue as string),
    } as ET;
    if (record[8].stringValue !== undefined) {
      result.expires = moment(record[8].stringValue);
    }
    return result;
  };

  protected applyDefaultsTo: <EKP extends EntityKeyParams<ET>, T>(
    func: (params: EKP, queryOptions: FinalQueryOptions, statementOptions: FinalStatementOptions) => T
  ) => (params: EKP, queryOptions?: InputQueryOptions, statementOptions?: InputStatementOptions) => T = <
    EKP extends EntityKeyParams<ET>,
    T
  >(
    func: (params: EKP, queryOptions: FinalQueryOptions, statementOptions: FinalStatementOptions) => T
  ) => {
    return (params: EKP, queryOptions: InputQueryOptions = {}, statementOptions: InputStatementOptions = {}) => {
      // default params set here
      const applyDuration: (duration?: moment.Duration) => moment.Moment | undefined = (duration) => {
        return duration && moment().add(duration);
      };
      const staticExpires: moment.Moment | undefined = params.expires || this.defaultParameterOptions.expires;
      const dynamicExpires: moment.Moment | undefined = params.expiresDuration
        ? applyDuration(params.expiresDuration)
        : applyDuration(this.defaultParameterOptions.expiresDuration);
      // default params set here
      const paramsWithDefaults: EKP = {
        ...this.defaultParameterOptions,
        expires: staticExpires || dynamicExpires,
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

  sqlToTagsWithVersion: (record: RDSDataService.FieldList) => ITagsWithVersion = (record) => {
    return {
      tags: JSON.parse(record[0].stringValue as string),
      version: record[1].longValue as number,
    };
  };

  getEntity: (
    params: EntityKeyGet<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `select * from entity
        where entityType = :entityType::entity_type
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
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    this.RDS.ensureRecords(result);
    return this.sqlToIEntity(result.records[0]);
  });

  getEntityTags: (
    params: EntityKeyTags<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `select tags, version from entity
      where entityType = :entityType::entity_type
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
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    this.RDS.ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });

  listEntities: (
    params: EntityKeyList<ET>,
    queryOptions?: InputQueryOptions
  ) => Promise<IListResponse<ET>> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `select * from entity
      where entityType = :entityType::entity_type
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and (not :prefixMatchId::boolean or entityId like format('%s%%',:entityIdPrefix::text))
      and (:tags::text is null or tags @> :tags::jsonb)
      and (not :filterExpired::boolean or expires is null or expires > now())
      order by entityId
      offset :offset
      limit :limit + 1;`;
    const offset = params.next ? parseInt(params.next, 16) : 0;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      tags: JSON.stringify(params.tags || {}),
      entityIdPrefix: params.idPrefix,
      prefixMatchId: !!params.idPrefix,
      filterExpired: queryOptions.filterExpired,
      offset,
      limit: queryOptions.listLimit,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    this.RDS.ensureRecords(result);
    let data: IListResponse<ET> = {
      items: result.records.map(this.sqlToIEntity.bind(this)),
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
    params: EntityKeyDelete<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<boolean> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `delete from entity
      where entityType = :entityType::entity_type
      and accountId = :accountId
      and subscriptionId = :subscriptionId
      and (not :prefixMatchId or entityId = :entityId)
      and (:prefixMatchId or entityId like format('%s%%',:entityIdPrefix::text))
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
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    return result.numberOfRecordsUpdated !== undefined && result.numberOfRecordsUpdated > 0;
  });

  createEntity: (
    params: EntityKeyCreate<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `insert into entity
      (entityType, accountId, subscriptionId, entityId, version, data, tags, expires)  
      values (
        :entityType::entity_type,
        :accountId,
        :subscriptionId,
        :entityId,
        1,
        :data::jsonb,
        :tags::jsonb,
        :expires::timestamptz
      )
      returning *;`;

    const sqlUpsert = `insert into entity
      (entityType, accountId, subscriptionId, entityId, version, data, tags, expires) 
      values (
        :entityType::entity_type,
        :accountId,
        :subscriptionId,
        :entityId,
        1,
        :data::jsonb,
        :tags::jsonb,
        :expires::timestamptz
      )
      on conflict (entityType, accountId, subscriptionId, entityId) do
      update set
      data = :data::jsonb,
      tags = :tags::jsonb,
      expires = :expires::timestamptz,
      version = coalesce(:version, entity.version) + 1
      returning *;`;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      data: JSON.stringify(params.data),
      tags: JSON.stringify(params.tags || {}),
      expires: params.expires?.format(),
      version: params.version,
    };
    let selectedInsert;
    if (queryOptions.upsert) {
      selectedInsert = sqlUpsert;
    } else {
      selectedInsert = sql;
    }
    const result = await this.RDS.executeStatement(selectedInsert, parameters, statementOptions);

    this.RDS.ensureRecords(result);
    if (result.records.length !== 1) {
      throw new Error(`Expected exactly 1 database record inserted, got ${result.records.length}.`);
    }
    return this.sqlToIEntity(result.records[0]);
  });

  updateEntity: (
    params: EntityKeyUpdate<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `update entity set
      data = :data::jsonb,
      tags = :tags::jsonb,
      expires = :expires::timestamptz,
      version = coalesce(:version, version) + 1
      where entityType = :entityType::entity_type
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
      data: JSON.stringify(params.data),
      tags: JSON.stringify(params.tags || {}),
      expires: params.expires?.format(),
      version: params.version,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    this.RDS.ensureRecords(result);
    return this.sqlToIEntity(result.records[0]);
  });

  updateEntityTags: (
    params: EntityKeyTags<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `update entity set
      version = coalesce(:version, entity.version) + 1,
      tags = :tags::jsonb
      where entityType = :entityType::entity_type
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
      version: params.version,
      tags: JSON.stringify(params.tags || {}),
      filterExpired: queryOptions.filterExpired,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    this.RDS.ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });

  setEntityTag: (
    params: EntityKeyTagSet<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `update entity set
      tags = jsonb_set(tags, format('{%s}', :tagKey)::text[], to_jsonb(:tagValue)),
      version = coalesce(:version, version) + 1
      where entityType = :entityType::entity_type
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
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    this.RDS.ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });

  deleteEntityTag: (
    params: EntityKeyTagSet<ET>,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = this.applyDefaultsTo(async (params, queryOptions, statementOptions) => {
    const sql = `update entity set
      tags = tags - :tagKey,
      version = coalesce(:version, version) + 1
      where entityType = :entityType::entity_type
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
      version: params.version,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    this.RDS.ensureRecords(result);
    return this.sqlToTagsWithVersion(result.records[0]);
  });
  static readonly EntityType = EntityType;
}
export default Entity;
