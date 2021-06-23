import { IncomingHttpHeaders } from 'http';

import { IAgent } from '@5qtrs/account-data';
import { Model } from '@5qtrs/db';
import { AwsRegistry } from '@5qtrs/registry';

import { operationService } from './OperationService';
import * as Function from '../../functions';

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

export const decomposeSubordinateId = (
  id: string
): { entityType: Model.EntityType; componentId: string; subordinateId: string } => {
  const split = id.split('/');
  return {
    entityType: split[1] as Model.EntityType,
    componentId: split[2],
    subordinateId: split[3],
  };
};

const rejectPermissionAgent = {
  checkPermissionSubset: () => {
    console.log(`XXX Temporary Grant-all on Permissions Until Finalized`);
    return Promise.resolve();
  },
};

export default abstract class BaseComponentService<E extends Model.IEntity, F extends Model.IEntity> {
  public abstract readonly entityType: Model.EntityType;
  public readonly dao: Model.IEntityDao<E>;
  public readonly subDao: Model.IEntityDao<F>;

  public createSubordinateId = (params: {
    entityType?: Model.EntityType;
    componentId: string;
    subordinateId: string;
  }) => {
    return `/${params.entityType || this.entityType}/${params.componentId}/${params.subordinateId}`;
  };

  public decomposeSubordinateId = decomposeSubordinateId;

  protected constructor(dao: Model.IEntityDao<E>, subDao: Model.IEntityDao<F>) {
    this.dao = dao;
    this.subDao = subDao;
  }

  public abstract sanitizeEntity(entity: Model.IEntity): Model.IEntity;
  public abstract createFunctionSpecification(entity: Model.IEntity): Function.IFunctionSpecification;

  public getEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.getEntity(entity),
  });

  public createEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    return operationService.inOperation(
      this.entityType,
      entity,
      { verb: 'creating', type: this.entityType },
      async () => {
        entity = this.sanitizeEntity(entity);
        await this.createEntityOperation(entity);
        await this.dao.createEntity(entity);
      }
    );
  };

  public createEntityOperation = async (entity: Model.IEntity) => {
    const params = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      boundaryId: this.entityType,
      functionId: entity.id,
    };

    const result = await Function.createFunction(
      params,
      this.createFunctionSpecification(entity),
      rejectPermissionAgent as IAgent,
      AwsRegistry.create({ ...entity, registryId: 'default' })
    );

    if (result.code === 201 && result.buildId) {
      await Function.waitForFunctionBuild(params, result.buildId, 100000);
    }
  };

  public updateEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    return operationService.inOperation(
      this.entityType,
      entity,
      { verb: 'updating', type: this.entityType },
      async () => {
        // Make sure the entity already exists.
        await this.dao.getEntity(entity);

        entity = this.sanitizeEntity(entity);

        // Delegate to the normal create code to recreate the function.
        await this.createEntityOperation(entity);

        // Update it.
        await this.dao.updateEntity(entity);
      }
    );
  };

  public deleteEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    return operationService.inOperation(
      this.entityType,
      entity,
      { verb: 'deleting', type: this.entityType },
      async () => {
        try {
          // Do delete things - create functions, collect their versions, and update the entity.data object
          // appropriately.
          await Function.deleteFunction({
            accountId: entity.accountId,
            subscriptionId: entity.subscriptionId,
            boundaryId: this.entityType,
            functionId: entity.id,
          });
        } catch (err) {
          if (err.status !== 404) {
            throw err;
          }
        }

        // Delete it.
        await this.dao.deleteEntity(entity);
      }
    );
  };

  public getEntityTag = async (entityKey: Model.IEntityKeyTagSet): Promise<string> => {
    const response = await this.dao.getEntityTags(entityKey);
    return response.tags[entityKey.tagKey];
  };

  public dispatch = async (
    entity: Model.IEntity,
    method: string,
    location: string,
    elements: IDispatchParams
  ): Promise<Function.IExecuteFunction> => {
    return Function.executeFunction(
      { ...entity, boundaryId: this.entityType, functionId: entity.id, version: undefined },
      method,
      location,
      elements
    );
  };
}
