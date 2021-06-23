import { IncomingHttpHeaders } from 'http';

import { Model } from '@5qtrs/db';

import * as Functions from '../../functions';

export interface IServiceResult {
  statusCode: number;
  contentType?: string;
  result: any;
}

export interface IDispatchParams {
  headers: IncomingHttpHeaders;
  body?: string | object;
  query?: object;
  originalUrl: string;
}

export interface ISubordinateId {
  entityType?: Model.EntityType | string;
  componentId: string;
  subordinateId: string;
}

export default abstract class BaseComponentService<E extends Model.IEntity, F extends Model.IEntity | E> {
  public abstract readonly entityType: Model.EntityType;
  public readonly dao: Model.IEntityDao<E>;
  public readonly subDao?: Model.IEntityDao<F>;

  public createSubordinateId = (params: {
    entityType?: Model.EntityType | string;
    componentId: string;
    subordinateId: string;
  }) => {
    return `/${params.entityType || this.entityType}/${params.componentId}/${params.subordinateId}`;
  };

  public decomposeSubordinateId = Model.decomposeSubordinateId;

  protected constructor(dao: Model.IEntityDao<E>, subDao?: Model.IEntityDao<F>) {
    this.dao = dao;
    this.subDao = subDao;
  }

  public loadDependentEntities = async (...args: Model.IEntity[]): Promise<Model.IEntity> => {
    return args[0];
  };

  public getEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.getEntity(entity),
  });

  public createEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.createEntity(entity),
  });

  public updateEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.updateEntity(entity),
  });

  public deleteEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.deleteEntity(entity),
  });

  public getEntityTags = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.getEntityTags(entity),
  });

  public deleteEntityTag = async (taggedEntity: Model.IEntityKeyTagSet): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.deleteEntityTag(taggedEntity),
  });

  public setEntityTag = async (taggedEntity: Model.IEntityKeyTagSet): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.setEntityTag(taggedEntity),
  });

  public getEntityTag = async (entityKey: Model.IEntityKeyTagSet): Promise<string> => {
    const response = await this.dao.getEntityTags(entityKey);
    return response.tags[entityKey.tagKey];
  };

  public dispatch = async (
    entity: Model.IEntity,
    method: string,
    location: string,
    elements: IDispatchParams
  ): Promise<Functions.IExecuteFunction> => {
    return Functions.executeFunction(
      { ...entity, boundaryId: this.entityType, functionId: entity.id, version: undefined },
      method,
      location,
      elements
    );
  };
}
