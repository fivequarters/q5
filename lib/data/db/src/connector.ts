import * as Model from './model';
import Entity from './entity';
import EntityType = Entity.EntityType;

//--------------------------------
// Connectors
//--------------------------------

class Connector extends Entity<Model.IConnector> {
  constructor() {
    super();
    this.entityType = EntityType.Connector;
  }
  protected readonly entityType: Entity.EntityType;
}

export default Connector;
