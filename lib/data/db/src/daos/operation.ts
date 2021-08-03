import * as Model from '../model';
import Entity from './entity';

// --------------------------------
// Operation
// --------------------------------

export default class Operation extends Entity<Model.IOperation> {
  constructor(RDS: Model.IRds, transactionId?: string) {
    super({
      RDS,
      filterExpired: true,
      entityType: Entity.EntityType.operation,
      upsert: true,
      transactionId,
    });
  }
}
