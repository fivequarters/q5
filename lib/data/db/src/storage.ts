import * as Model from './model';
import Entity from './entity';

//--------------------------------
// Storage
//--------------------------------

class Storage extends Entity<Model.IStorageItem> {
  constructor() {
    super({
      entityType: Entity.EntityType.Storage,
      upsert: true,
      filterExpired: true,
    });
  }
}

export default Storage;
