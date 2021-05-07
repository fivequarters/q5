import * as Model from './model';
import Entity from './entity';
import EntityType = Entity.EntityType;

//--------------------------------
// Storage
//--------------------------------

class Storage extends Entity<Model.IStorageItem> {
  constructor() {
    super({
      entityType: EntityType.Storage,
    });
  }
}
