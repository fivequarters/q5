import * as Model from './model';
import Entity from './entity';
import EntityType = Entity.EntityType;

//--------------------------------
// Connectors
//--------------------------------

class Connector extends Entity<Model.IConnector> {
  constructor() {
    super({
      entityType: EntityType.Connector,
    });
  }
}

export default Connector;
