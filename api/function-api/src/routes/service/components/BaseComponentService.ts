import { NextFunction, Request, Response } from 'express';
import { Model } from '@5qtrs/db';

export interface IServiceResult {
  statusCode: number;
  result: any;
}

export default abstract class BaseComponentService<E extends Model.IEntity> {
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

  public dispatch = async (req: Request, res: Response, next: NextFunction) => {
    return;
  };

  public health = ({ id }: { id: string }): Promise<boolean> => {
    return Promise.resolve(false);
  };
}
