import * as Model from '../model';
import Entity from './entity';
import { IRds } from '../model';

// --------------------------------
// Storage
// --------------------------------

class Storage extends Entity<Model.IStorageItem> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.Storage,
      upsert: true,
      filterExpired: true,
      transactionId,
    });
  }
}

export default Storage;
