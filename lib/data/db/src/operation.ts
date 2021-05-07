import * as Model from './model';
import Entity from './entity';

//--------------------------------
// Operation
//--------------------------------

export default class Operation extends Entity<Model.IOperation> {
  constructor() {
    super({
      filterExpired: true,
      entityType: Entity.EntityType.Operation,
      expires: 10 * 60 * 1000,
    });
  }
}
