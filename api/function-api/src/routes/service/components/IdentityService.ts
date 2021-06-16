import SessionedComponentService from './SessionedComponentService';
import RDS, { Model } from '@5qtrs/db';

class IdentityService extends SessionedComponentService<Model.IIdentity> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.connector);
    this.entityType = Model.EntityType.identity;
  }

  addService(service: SessionedComponentService<any>): void {}
}

export default IdentityService;
