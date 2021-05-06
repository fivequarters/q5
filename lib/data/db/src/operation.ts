import * as Model from './model';
import Entity from './entity';
import EntityType = Entity.EntityType;
import { IQueryOptions, IStatementOptions } from './model';

//--------------------------------
// Operation
//--------------------------------

const defaultOperationExpiry = 10 * 60 * 1000;

export default class Operation extends Entity<Model.IOperation> {
  constructor() {
    super();
    this.entityType = EntityType.Operation;
  }
  protected readonly entityType: Entity.EntityType;

  createEntity: (
    params: Model.IOperation,
    queryOptions: IQueryOptions,
    statementOptions: IStatementOptions
  ) => Promise<Model.IOperation> = async (params, queryOptions = {}, statementOptions = {}) => {
    return super.createEntity(
      { ...params, expires: Date.now() + defaultOperationExpiry, version: undefined, tags: {} },
      { ...queryOptions, upsert: true },
      { ...statementOptions }
    );
  };
}
