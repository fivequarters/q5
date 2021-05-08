import * as Model from './model';
import Entity from './entity';
import moment from 'moment';

//--------------------------------
// Operation
//--------------------------------

export default class Operation extends Entity<Model.IOperation> {
  constructor() {
    super({
      filterExpired: true,
      entityType: Entity.EntityType.Operation,
      expiresDuration: moment.duration(10, 'hours'),
    });
  }
}
