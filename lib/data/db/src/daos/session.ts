import Entity from './entity';
import { ISession, IRds } from '../model';

// --------------------------------
// Sessions
// --------------------------------

class Session extends Entity<ISession> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.session,
      transactionId,
    });
  }
}

export default Session;
