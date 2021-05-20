import Entity from './entity';
import { IIdentity, IRds } from '../model';

//--------------------------------
// Connectors
//--------------------------------

class Identity extends Entity<IIdentity> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.Identity,
      transactionId,
    });
  }
}

export default Identity;
