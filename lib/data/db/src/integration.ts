import * as Model from './model';
import Entity from './entity';
import EntityType = Entity.EntityType;

//--------------------------------
// Integrations
//--------------------------------

class Integration extends Entity<Model.IIntegration> {
  constructor() {
    super({
      entityType: EntityType.Integration,
    });
  }
}

export default Integration;
