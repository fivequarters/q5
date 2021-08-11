import http_error from 'http-errors';

import { IAgent } from '@5qtrs/account-data';
import RDS, { Model } from '@5qtrs/db';
import BaseEntityService from './BaseEntityService';

import * as Function from '../functions';

class InstanceService extends BaseEntityService<Model.IInstance, Model.IInstance> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.instance);
    this.entityType = Model.EntityType.instance;
  }

  public sanitizeEntity = (entity: Model.IEntity): Model.IEntity => {
    return entity;
  };

  public getFunctionSecuritySpecification(): any {
    throw http_error(500, 'invalid function creation');
  }

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

  public updateEntity = async (resolvedAgent: IAgent, entity: Model.IEntity) => {
    return {
      statusCode: 200,
      result: await this.dao.updateEntity(entity),
    };
  };

  public createEntity = async (resolvedAgent: IAgent, entity: Model.IEntity) => {
    return {
      statusCode: 200,
      result: await this.dao.createEntity(entity),
    };
  };

  public deleteEntity = async (entity: Model.IEntity) => {
    return {
      statusCode: 200,
      result: await this.dao.deleteEntity(entity),
    };
  };
}

export default InstanceService;
