import * as Model from '../model';
import Entity from './entity';
import { IRds } from '../model';

//--------------------------------
// Integrations
//--------------------------------

class Integration extends Entity<Model.IIntegration> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.Integration,
      transactionId,
    });
  }
}

export default Integration;
