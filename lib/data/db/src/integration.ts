import * as Model from './model';
import Entity from './entity';
import EntityType = Entity.EntityType;

//--------------------------------
// Integrations
//--------------------------------

class Integration extends Entity<Model.IIntegration> {
  constructor() {
    super();
    this.entityType = EntityType.Integration;
  }
  protected readonly entityType: Entity.EntityType;
}

export default Integration;
