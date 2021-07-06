import http_error from 'http-errors';

import RDS, { Model } from '@5qtrs/db';
import BaseEntityService from './BaseEntityService';

import * as Function from '../functions';

class IdentityService extends BaseEntityService<Model.IIdentity, Model.IIdentity> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.identity);
    this.entityType = Model.EntityType.identity;
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
    connectorArg: Model.IEntity,
    identityArg: Model.IEntity
  ): Promise<Model.IEntity> => {
    const connector = await RDS.DAO.connector.getEntity(connectorArg);
    return {
      ...identityArg,
      id: `/connector/${connector.__databaseId}/${identityArg.id}`,
    };
  };

  public updateEntity = async (entity: Model.IEntity) => {
    return {
      statusCode: 200,
      result: await this.dao.updateEntity(entity),
    };
  };

  public createEntity = async (entity: Model.IEntity) => {
    return {
      statusCode: 200,
      result: await this.dao.createEntity(entity),
    };
  };
}

export default IdentityService;
