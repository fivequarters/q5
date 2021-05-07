import * as Model from './model';
import Entity from './entity';
import EntityType = Entity.EntityType;

//--------------------------------
// Operation
//--------------------------------

const defaultOperationExpiry = 10 * 60 * 1000;

export default class Operation extends Entity<Model.IOperation> {
  constructor() {
    super({
      defaultFilterExpired: false,
      defaultListLimit: 0,
      defaultPrefixMatchId: false,
      defaultUpsert: false,
      entityType: EntityType.Operation,
    });
  }
}
