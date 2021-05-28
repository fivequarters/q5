import { NextFunction, Request, Response } from 'express';
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

export default abstract class BaseComponentService<E extends Model.IEntity> {
  abstract get entityType(): Model.EntityType;
  protected constructor(dao: Model.IEntityDao<E>) {
    this.dao = dao;
  }
  public readonly dao: Model.IEntityDao<E>;

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

  public getEntityTag = async (entityKey: Model.IEntityKeyTagSet): Promise<string> => {
    const response = await this.dao.getEntityTags(entityKey);
    return response.tags[entityKey.tagKey];
  };

  public dispatch = async (
    entity: Model.IEntity,
    method: string,
    path: string,
    elements: IDispatchParams
  ): Promise<Functions.IExecuteFunction> => {
    return Functions.executeFunction(
      { ...entity, boundaryId: this.entityType, functionId: entity.id, version: undefined },
      method,
      `/api/${path}`,
      elements
    );
  };

  public health = ({ id }: { id: string }): Promise<boolean> => {
    return Promise.resolve(false);
  };
}
