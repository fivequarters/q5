import RDS, { Model } from '@5qtrs/db';
import BaseComponentService from './BaseComponentService';

class InstanceService extends BaseComponentService<Model.IInstance, Model.IInstance> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.instance);
    this.entityType = Model.EntityType.instance;
  }
}

export default InstanceService;
