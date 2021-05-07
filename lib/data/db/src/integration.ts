import * as Model from './model';
import Entity from './entity';

//--------------------------------
// Integrations
//--------------------------------

class Integration extends Entity<Model.IIntegration> {
  constructor() {
    super({
      entityType: Entity.EntityType.Integration,
    });
  }
}

export default Integration;
