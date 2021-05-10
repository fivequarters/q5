import moment from 'moment';
import {
  InputConstructorArguments,
  MergedConstructorArguments,
  FinalQueryOptions,
  FinalStatementOptions,
  InputQueryOptions,
  InputStatementOptions,
  MergedParameterOptions,
  MergedQueryOptions,
  MergedStatementOptions,
  EntityType,
  IEntity,
  EntityKeyParams,
  IListResponse,
  IEntityDao,
  IRds,
  DefaultConstructorArguments,
  RequiredKeysOnly,
  IEntityGeneric,
  ITagsWithVersion,
  IEntityId,
  IEntityPrefix,
  IEntityKeyTagSet,
} from '../model';

//--------------------------------
// Internal
//--------------------------------

const defaultEntityConstructorArgument: DefaultConstructorArguments = {
  upsert: true,
  filterExpired: true,
  listLimit: 100,
};

export abstract class Entity<ET extends IEntityGeneric> implements IEntityDao<ET> {
  /**
   * Clones the existing subclassed Entity with a transactionId.
   * All calls using the cloned object will be wrapped within that transaction.
   *
   * @param transactionId the id of the transaction to be wrapped in, provided by aurora
   */
  public readonly createTransactional: (transactionId: string) => this = (transactionId) => {
    return Reflect.construct(this.constructor, [this.RDS, transactionId]);
  };

  protected constructor(config: InputConstructorArguments) {
    this.RDS = config.RDS;
    const entityConfig: MergedConstructorArguments = {
      ...defaultEntityConstructorArgument,
      ...cleanObj(config),
    };
    this.entityType = entityConfig.entityType;

    this.defaultQueryOptions = {
      filterExpired: entityConfig.filterExpired,
      listLimit: entityConfig.listLimit,
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

  protected readonly IGNORE = 'ignore';
  protected readonly fieldCapitalizationMap: { [key: string]: string } = {
    accountid: 'accountId',
    entityid: 'id',
    entitytype: 'entityType',
    subscriptionid: 'subscriptionId',
    id: this.IGNORE,
  };

  sqlToIEntity: <T>(result: AWS.RDSDataService.ExecuteStatementResponse) => T[] = <T>(
    result: AWS.RDSDataService.ExecuteStatementResponse
  ) => {
    this.RDS.ensureRecords(result);
    return result.records.map((r) => {
      let obj: { [key: string]: any } = {};
      r.map((v, i) => {
        const columnName = result.columnMetadata[i].name;
        if (columnName === undefined) {
          return;
        }
        const name: string = this.fieldCapitalizationMap[columnName] || columnName;
        if (name === this.IGNORE) {
          return;
        }

        let value = Object.values(v)[0];

        if (result.columnMetadata[i].typeName?.startsWith('json')) {
          value = JSON.parse(value);
        } else if (Object.keys(v)[0] === 'isNull') {
          value = undefined;
        } else if (result.columnMetadata[i].typeName?.startsWith('time')) {
          value = moment(value);
        }

        obj[name] = value;
      });
      return obj as T;
    });
  };

  protected applyDefaultsTo: <EKP extends EntityKeyParams>(
    params: EKP,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => { params: EKP; queryOptions: FinalQueryOptions; statementOptions: FinalStatementOptions } = <
    EKP extends EntityKeyParams
  >(
    params: EKP,
    queryOptions: InputQueryOptions = {},
    statementOptions: InputStatementOptions = {}
  ) => {
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
      ...cleanObj(params),
    };
    // default query options set here
    const queryOptionsWithDefaults: FinalQueryOptions = {
      ...this.defaultQueryOptions,
      ...cleanObj(queryOptions),
      listLimit: queryOptions.listLimit
        ? Math.min(queryOptions.listLimit, this.defaultQueryOptions.listLimit)
        : this.defaultQueryOptions.listLimit,
    };
    // default statement options set here
    const statementOptionsWithDefaults: FinalStatementOptions = {
      ...this.defaultStatementOptions,
      ...cleanObj(statementOptions),
    };
    return {
      params: paramsWithDefaults,
      queryOptions: queryOptionsWithDefaults,
      statementOptions: statementOptionsWithDefaults,
    };
  };

  getEntity: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `select * from entity
        where entityType = :entityType::entity_type
        and accountId = :accountId
        and subscriptionId = :subscriptionId
        and entityId = :entityId
        and (not :filterExpired or expires is null or expires > now())
        limit 1;`;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    return this.sqlToIEntity<ET>(result)[0];
  };

  getEntityTags: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
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
    return this.sqlToIEntity<ITagsWithVersion>(result)[0];
  };

  listEntities: (params: IEntityPrefix, queryOptions?: InputQueryOptions) => Promise<IListResponse<ET>> = async (
    inputParams,
    inputQueryOptions
  ) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(inputParams, inputQueryOptions);
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
    let data: IListResponse<ET> = {
      items: this.sqlToIEntity(result),
    };
    // Limit of the query was set to `limit + 1` in order to grab 1 additional element.
    // This helps to determine whether there are yet more items that need to be retrieved.
    if (data.items.length === queryOptions.listLimit + 1) {
      data.items.splice(-1);
      data.next = ((offset || 0) + queryOptions.listLimit).toString(16);
    }
    return data;
  };

  deleteEntity: (
    params: IEntityPrefix,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<boolean> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
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
      prefixMatchId: !!params.idPrefix,
      filterExpired: queryOptions.filterExpired,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    return result.numberOfRecordsUpdated !== undefined && result.numberOfRecordsUpdated > 0;
  };

  createEntity: (
    params: IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
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
    return this.sqlToIEntity<ET>(result)[0];
  };

  updateEntity: (
    params: IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
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
    return this.sqlToIEntity<ET>(result)[0];
  };

  updateEntityTags: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
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
    return this.sqlToIEntity<ITagsWithVersion>(result)[0];
  };

  setEntityTag: (
    params: IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
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
    return this.sqlToIEntity<ITagsWithVersion>(result)[0];
  };

  deleteEntityTag: (
    params: IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
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
    return this.sqlToIEntity<ITagsWithVersion>(result)[0];
  };
  static readonly EntityType = EntityType;
}

const cleanObj: <T extends { [key: string]: any }>(obj: T) => RequiredKeysOnly<T> = <T extends { [key: string]: any }>(
  obj: T
) => {
  const removeUndefined: (o: T) => asserts o is RequiredKeysOnly<T> = (o) =>
    Object.entries(o).forEach((e) => {
      if (e[1] === undefined) {
        delete o[e[0]];
      }
    });
  removeUndefined(obj);
  return obj;
};

export default Entity;
