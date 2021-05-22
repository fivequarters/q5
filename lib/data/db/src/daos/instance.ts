import Entity from './entity';
import { IInstance, IRds } from '../model';

// --------------------------------
// Instances
// --------------------------------

class Instance extends Entity<IInstance> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.instance,
      transactionId,
    });
  }
}

export default Instance;
