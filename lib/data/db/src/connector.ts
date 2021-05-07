import * as Model from './model';
import Entity from './entity';

//--------------------------------
// Connectors
//--------------------------------

class Connector extends Entity<Model.IConnector> {
  constructor() {
    super({
      entityType: Entity.EntityType.Connector,
    });
  }
}

export default Connector;
