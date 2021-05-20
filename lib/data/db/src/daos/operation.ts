import * as Model from '../model';
import Entity from './entity';
import moment from 'moment';
import { IRds } from '../model';

// --------------------------------
// Operation
// --------------------------------

export default class Operation extends Entity<Model.IOperation> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      filterExpired: true,
      entityType: Entity.EntityType.Operation,
      expiresDuration: moment.duration(10, 'hours'),
      transactionId,
    });
  }
}
