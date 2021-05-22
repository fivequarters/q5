import Entity from './entity';
import { IConnector, IRds } from '../model';

// --------------------------------
// Connectors
// --------------------------------

class Connector extends Entity<IConnector> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.connector,
      transactionId,
    });
  }
}

export default Connector;
