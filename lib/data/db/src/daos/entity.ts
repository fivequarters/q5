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

// --------------------------------
// Internal
// --------------------------------

const DELETE_SAFETY_PREFIX_LEN = 3;

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

  public sqlToIEntity: <T>(result: AWS.RDSDataService.ExecuteStatementResponse) => T[] = <T>(
    result: AWS.RDSDataService.ExecuteStatementResponse
  ) => {
    this.RDS.ensureRecords(result);
    return result.records.map((r) => {
      const obj: { [key: string]: any } = {};
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

  public getEntity: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `SELECT * FROM entity
        WHERE entityType = :entityType::entity_type
        AND accountId = :accountId
        AND subscriptionId = :subscriptionId
        AND entityId = :entityId
        AND (NOT :filterExpired OR expires IS NULL OR expires > NOW())
        LIMIT 1;`;
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

  public getEntityTags: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `SELECT tags, version FROM entity
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND entityId = :entityId
      AND (NOT :filterExpired OR expires IS NULL OR expires > NOW());`;
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

  public listEntities: (params: IEntityPrefix, queryOptions?: InputQueryOptions) => Promise<IListResponse<ET>> = async (
    inputParams,
    inputQueryOptions
  ) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(inputParams, inputQueryOptions);
    const sql = `SELECT * FROM entity
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND (NOT :prefixMatchId::boolean OR entityId LIKE FORMAT('%s%%',:entityIdPrefix::text))
      AND (:tags::text IS NULL OR tags @> :tags::jsonb)
      AND (NOT :filterExpired::boolean OR expires IS NULL OR expires > NOW())
      ORDER BY entityId
      OFFSET :offset
      LIMIT :limit + 1;`;
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
    const data: IListResponse<ET> = {
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

  public deleteEntity: (
    params: IEntityPrefix,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<boolean> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );

    const sqlPlain = `DELETE FROM entity
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND (:prefixMatchId OR entityId = :entityId)
      AND (NOT :prefixMatchId OR entityId LIKE FORMAT('%s%%',:entityIdPrefix::text))
      AND (NOT :filterExpired OR expires IS NULL OR expires > NOW());`;

    const sqlWithVersion = `
      SELECT delete_on_version(:entityType::entity_type, :accountId, :subscriptionId, :prefixMatchId::BOOLEAN,
				:entityId, :entityIdPrefix, :filterExpired::BOOLEAN, :version::BIGINT) as deletedRows;
      `;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      entityIdPrefix: params.idPrefix,
      prefixMatchId: !!params.idPrefix,
      filterExpired: queryOptions.filterExpired,
      ...(params.version ? { version: params.version } : {}),
    };

    const sql = params.version ? sqlWithVersion : sqlPlain;

    if (
      parameters.prefixMatchId &&
      parameters.entityIdPrefix &&
      parameters.entityIdPrefix.length < DELETE_SAFETY_PREFIX_LEN
    ) {
      throw new Error(`Delete prefix match must be ${DELETE_SAFETY_PREFIX_LEN} characters or greater`);
    }

    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    const numDeleted =
      params.version && result.records ? result.records[0][0].longValue : result.numberOfRecordsUpdated;
    return numDeleted !== undefined && numDeleted > 0;
  };

  public createEntity: (
    params: IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `INSERT INTO entity
      (entityType, accountId, subscriptionId, entityId, version, data, tags, expires)  
      VALUES (
        :entityType::entity_type,
        :accountId,
        :subscriptionId,
        :entityId,
        1,
        :data::jsonb,
        :tags::jsonb,
        :expires::timestamptz
      )
      RETURNING *;`;

    const sqlUpsert = `INSERT INTO entity
      (entityType, accountId, subscriptionId, entityId, version, data, tags, expires) 
      VALUES (
        :entityType::entity_type,
        :accountId,
        :subscriptionId,
        :entityId,
        1,
        :data::jsonb,
        :tags::jsonb,
        :expires::timestamptz
      )
      ON CONFLICT (entityType, accountId, subscriptionId, entityId) DO
      UPDATE SET
      data = :data::jsonb,
      tags = :tags::jsonb,
      expires = :expires::timestamptz,
      version = COALESCE(:version, entity.version) + 1
      RETURNING *;`;

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
    const selectedInsert = queryOptions.upsert ? sqlUpsert : sql;

    const result = await this.RDS.executeStatement(selectedInsert, parameters, statementOptions);

    this.RDS.ensureRecords(result);
    if (result.records.length !== 1) {
      throw new Error(`Expected exactly 1 database record inserted, got ${result.records.length}.`);
    }
    return this.sqlToIEntity<ET>(result)[0];
  };

  public updateEntity: (
    params: IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `UPDATE entity SET
      data = :data::jsonb,
      tags = :tags::jsonb,
      expires = :expires::timestamptz,
      version = COALESCE(:version, version) + 1
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND entityId = :entityId
      AND (NOT :filterExpired OR expires IS NULL OR expires > NOW())
      RETURNING *`;

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

  public updateEntityTags: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `UPDATE entity SET
      version = COALESCE(:version, entity.version) + 1,
      tags = :tags::jsonb
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND entityId = :entityId
      AND (NOT :filterExpired OR expires IS NULL OR expires > NOW())
      RETURNING tags, version;`;
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

  public setEntityTag: (
    params: IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `UPDATE entity SET
      tags = jsonb_set(tags, format('{%s}', :tagKey)::text[], to_jsonb(:tagValue)),
      version = COALESCE(:version, version) + 1
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND entityId = :entityId
      AND (NOT :filterExpired OR expires IS NULL OR expires > NOW())
      RETURNING tags, version;`;
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

  public deleteEntityTag: (
    params: IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion> = async (inputParams, inputQueryOptions, inputStatementOptions) => {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `UPDATE entity SET
      tags = tags - :tagKey,
      version = COALESCE(:version, version) + 1
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND entityId = :entityId
      AND (:filterExpired IS NULL OR expires IS NULL OR expires > NOW())
      RETURNING tags, version;`;
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
  public static readonly EntityType = EntityType;
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
