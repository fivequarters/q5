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

export abstract class Entity<ET extends IEntity> implements IEntityDao<ET> {
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
    this.defaultParameterOptions = {};
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
        }

        obj[name] = value;
      });
      return obj as T;
    });
  };

  protected applyDefaultsTo<EKP extends EntityKeyParams>(
    params: EKP,
    queryOptions: InputQueryOptions = {},
    statementOptions: InputStatementOptions = {}
  ): { params: EKP; queryOptions: FinalQueryOptions; statementOptions: FinalStatementOptions } {
    // default params set here
    // default params set here
    const paramsWithDefaults: EKP = {
      ...this.defaultParameterOptions,
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
  }

  public async getEntity(
    inputParams: IEntityId,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ET> {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `SELECT *, to_json(expires)#>>'{}' as expires FROM entity
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
  }

  public async getEntityTags(
    inputParams: IEntityId,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ITagsWithVersion> {
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
  }

  public async listEntities(
    inputParams: IEntityPrefix,
    inputQueryOptions?: InputQueryOptions
  ): Promise<IListResponse<ET>> {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(inputParams, inputQueryOptions);

    // Note the doubled '?' to escape the '?' in the '?&' operator.
    const sql = `SELECT *, to_json(expires)#>>'{}' as expires FROM entity
      WHERE entityType = :entityType::entity_type
      AND accountId = :accountId
      AND subscriptionId = :subscriptionId
      AND (NOT :prefixMatchId::boolean OR entityId LIKE FORMAT('%s%%',:entityIdPrefix::text))
      AND (:tagValues::text IS NULL OR tags @> :tagValues::jsonb)
      AND (:tagKeys::text IS NULL OR tags ??& :tagKeys::text[])
      AND (NOT :filterExpired::boolean OR expires IS NULL OR expires > NOW())
      ORDER BY entityId
      OFFSET :offset
      LIMIT :limit + 1;`;

    const offset = queryOptions.next ? parseInt(queryOptions.next, 16) : 0;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      tagValues: params.tags ? JSON.stringify(params.tags) : '{}',
      // Create a text array
      tagKeys: params.tags
        ? '{' +
          Object.entries(params.tags)
            .filter(([k, v]) => !v)
            .map((e) => `"${e[0]}"`)
            .join(',') +
          '}'
        : '{}',
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
  }

  public async deleteEntity(
    inputParams: IEntityPrefix,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<boolean> {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );

    // Unless the filterExpired was explicitly set, delete expired entries happily.
    if (!inputQueryOptions || !inputQueryOptions.filterExpired) {
      queryOptions.filterExpired = false;
    }

    const prefixMatchId = !!params.idPrefix;

    if (prefixMatchId && params.idPrefix && params.idPrefix.length < DELETE_SAFETY_PREFIX_LEN) {
      throw new Error(`Delete prefix match must be ${DELETE_SAFETY_PREFIX_LEN} characters or greater`);
    }

    const sql = `
      SELECT * FROM delete_if_version(
        :entityType::entity_type, :accountId, :subscriptionId, :entityId,
        :filterExpired::BOOLEAN, :prefixMatchId::BOOLEAN,
        :version);
      `;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: prefixMatchId ? params.idPrefix : params.id,
      prefixMatchId,
      filterExpired: queryOptions.filterExpired,
      version: params.version,
    };

    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    const numDeleted = result.records ? result.records[0][0].longValue : 0;
    return numDeleted !== undefined && numDeleted > 0;
  }

  public async createEntity(
    inputParams: IEntity,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ET> {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );
    const sql = `INSERT INTO entity
      (entityType, accountId, subscriptionId, entityId, data, tags, version, expires)  
      VALUES (
        :entityType::entity_type,
        :accountId,
        :subscriptionId,
        :entityId,
        :data::jsonb,
        :tags::jsonb,
        gen_random_uuid(),
        :expires::timestamptz
      )
      RETURNING *, to_json(expires)#>>'{}' as expires;`;

    const sqlUpsert = `
        SELECT *, to_json(expires)#>>'{}' as expires FROM update_if_version(
          :entityType::entity_type, :accountId, :subscriptionId, :entityId,
          FALSE, FALSE, TRUE,
          :data::jsonb, :tags::jsonb, :expires::timestamptz, :version);`;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      data: JSON.stringify(params.data),
      tags: JSON.stringify(params.tags || {}),
      expires: params.expires,
      version: params.version,
    };
    const selectedInsert = queryOptions.upsert ? sqlUpsert : sql;

    const result = await this.RDS.executeStatement(selectedInsert, parameters, statementOptions);

    this.RDS.ensureRecords(result);
    if (result.records.length !== 1) {
      throw new Error(`Expected exactly 1 database record inserted, got ${result.records.length}.`);
    }
    return this.sqlToIEntity<ET>(result)[0];
  }

  public async updateFullEntity(
    inputParams: IEntity,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ET> {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );

    const sql = `
      SELECT *, to_json(expires)#>>'{}' as expires FROM update_if_version(
        :entityType::entity_type, :accountId, :subscriptionId, :entityId,
        :filterExpired::BOOLEAN, :prefixMatchId::BOOLEAN, FALSE,
        :data::jsonb, :tags::jsonb, :expires::timestamptz, :version);
      `;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
      prefixMatchId: false,
      data: params.data ? JSON.stringify(params.data) : undefined,
      tags: params.tags ? JSON.stringify(params.tags) : undefined,
      expires: params.expires,
      version: params.version,
    };

    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    return this.sqlToIEntity<ET>(result)[0];
  }

  public async updateEntity(
    inputParams: IEntity,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ET> {
    return this.updateFullEntity(inputParams, inputQueryOptions, inputStatementOptions);
  }

  public async updateEntityTags(
    inputParams: IEntity,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ITagsWithVersion> {
    const result = (await this.updateFullEntity(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    )) as ITagsWithVersion;
    return { tags: result.tags, version: result.version };
  }

  public async setEntityTag(
    inputParams: IEntityKeyTagSet,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ITagsWithVersion> {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );

    const sql = `
      SELECT tags, version FROM update_tag_if_version(
        :entityType::entity_type, :accountId, :subscriptionId, :entityId,
        :filterExpired::boolean, FALSE,
        :tagKey, :tagValue::jsonb, :version);
      `;
    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
      tagKey: params.tagKey,
      tagValue: JSON.stringify(params.tagValue),
      version: params.version,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    return this.sqlToIEntity<ITagsWithVersion>(result)[0];
  }

  public async deleteEntityTag(
    inputParams: IEntityKeyTagSet,
    inputQueryOptions?: InputQueryOptions,
    inputStatementOptions?: InputStatementOptions
  ): Promise<ITagsWithVersion> {
    const { params, queryOptions, statementOptions } = this.applyDefaultsTo(
      inputParams,
      inputQueryOptions,
      inputStatementOptions
    );

    const sql = `
      SELECT tags, version FROM delete_tag_if_version(
        :entityType::entity_type, :accountId, :subscriptionId, :entityId,
        :filterExpired::boolean, FALSE,
        :tagKey, :version);
      `;

    const parameters = {
      entityType: this.entityType,
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityId: params.id,
      filterExpired: queryOptions.filterExpired,
      tagKey: params.tagKey,
      version: params.version,
    };
    const result = await this.RDS.executeStatement(sql, parameters, statementOptions);
    return this.sqlToIEntity<ITagsWithVersion>(result)[0];
  }
  public static readonly EntityType = EntityType;
}

const cleanObj = <T extends { [key: string]: any }>(obj: T): RequiredKeysOnly<T> => {
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
