import RDS, { Model } from '@5qtrs/db';
import BaseComponentService from './BaseComponentService';
import { IEntity } from '@5qtrs/db/libc/model';

class InstanceService extends BaseComponentService<Model.IInstance, Model.IInstance> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.instance);
    this.entityType = Model.EntityType.instance;
  }

  public loadDependentEntities = async (integrationArg: IEntity, instanceArg: IEntity): Promise<IEntity> => {
    const integration = await RDS.DAO.integration.getEntity(integrationArg);
    return {
      ...instanceArg,
      id: `/integration/${integration.__databaseId}/${instanceArg.id}`,
    };
  };
}

export default InstanceService;
