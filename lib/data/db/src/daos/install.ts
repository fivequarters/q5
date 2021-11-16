import Entity from './entity';
import { IInstall, IRds } from '../model';

// --------------------------------
// Installs
// --------------------------------

class Install extends Entity<IInstall> {
  constructor(RDS: IRds, transactionId?: string) {
    super({
      RDS,
      entityType: Entity.EntityType.install,
      transactionId,
    });
  }
}

export default Install;
