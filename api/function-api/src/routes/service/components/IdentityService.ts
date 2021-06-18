import RDS, { Model } from '@5qtrs/db';
import BaseComponentService from './BaseComponentService';

class IdentityService extends BaseComponentService<Model.IIdentity, Model.IIdentity> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.identity);
    this.entityType = Model.EntityType.identity;
  }
}

export default IdentityService;
