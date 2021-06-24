import http_error from 'http-errors';

import RDS, { Model } from '@5qtrs/db';
import BaseComponentService from './BaseComponentService';

import * as Function from '../../functions';

class InstanceService extends BaseComponentService<Model.IInstance, Model.IInstance> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.instance);
    this.entityType = Model.EntityType.instance;
  }

  public sanitizeEntity = (entity: Model.IEntity): Model.IEntity => {
    return entity;
  };

  public createFunctionSpecification = (entity: Model.IEntity): Function.IFunctionSpecification => {
    throw http_error(500, 'invalid function creation');
  };

  public loadDependentEntities = async (
    integrationArg: Model.IEntity,
    instanceArg: Model.IEntity
  ): Promise<Model.IEntity> => {
    const integration = await RDS.DAO.integration.getEntity(integrationArg);
    return {
      ...instanceArg,
      id: `/integration/${integration.__databaseId}/${instanceArg.id}`,
    };
  };
}

export default InstanceService;
