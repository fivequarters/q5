import Entity from './entity';
import { IConnector, IEntityDao, IRds } from '../model';

//--------------------------------
// Connectors
//--------------------------------

class Connector extends Entity<IConnector> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.Connector,
      transactionId,
    });
  }
}

export default Connector;
