import Entity from './entity';
import { IIdentity, IRds } from '../model';

// --------------------------------
// Connectors
// --------------------------------

class Identity extends Entity<IIdentity> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.identity,
      transactionId,
    });
  }
}

export default Identity;
