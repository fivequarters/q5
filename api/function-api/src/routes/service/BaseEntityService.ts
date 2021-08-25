import { IAgent } from '@5qtrs/account-data';
import { Model } from '@5qtrs/db';

import * as Function from '../functions';

export const defaultFrameworkSemver = '^3.0.2';

export interface IServiceResult {
  statusCode: number;
  contentType?: string;
  result: any;
}

export default abstract class BaseEntityService<E extends Model.IEntity, F extends Model.IEntity | E> {
  public abstract readonly entityType: Model.EntityType;
  public readonly dao: Model.IEntityDao<E>;
  public readonly subDao?: Model.IEntityDao<F>;

  protected constructor(dao: Model.IEntityDao<E>, subDao?: Model.IEntityDao<F>) {
    this.dao = dao;
    this.subDao = subDao;
  }

  public loadDependentEntities = async (...args: Model.IEntity[]): Promise<Model.IEntity> => {
    return args[0];
  };

  public abstract sanitizeEntity(entity: Model.IEntity): Model.IEntity;
  public abstract getFunctionSecuritySpecification(entity: Model.IEntity): any;

  public createFunctionSpecification = (entity: Model.IEntity): Function.IFunctionSpecification => {
    // Make a copy of data so the files can be removed.
    const functionConfig = { ...entity.data };
    const pkg = JSON.parse(functionConfig.files['package.json']);
    delete functionConfig.files;

    // Add the baseUrl to the configuration.
    const config = {
      ...functionConfig,
      mountUrl: `/v2/account/${entity.accountId}/subscription/${entity.subscriptionId}/integration/${entity.id}`,
    };

    const spec = {
      id: entity.id,
      nodejs: {
        ...(pkg.engines?.node ? { engines: { node: pkg.engines.node } } : {}),
        files: {
          ...entity.data.files,

          // Don't allow the index.js to be overwritten.
          'index.js': [
            `const config = ${JSON.stringify(config)};`,
            `let handler = '${functionConfig.handler}';`,
            "handler = handler[0] === '.' ? `${__dirname}/${handler}`: handler;",
            `module.exports = require('@fusebit-int/framework').Internal.Handler(handler, config);`,
          ].join('\n'),
        },
      },
      security: this.getFunctionSecuritySpecification(entity),
    };

    return spec;
  };

  public getEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.getEntity(entity),
  });

  public createEntity = async (resolvedAgent: IAgent, entity: Model.IEntity): Promise<IServiceResult> => {
    try {
      // Create the entity
      entity = this.sanitizeEntity(entity);
    } catch (err) {
      return { statusCode: 400, result: err.message };
    }
    entity.state = Model.EntityState.creating;
    entity.operationStatus = { statusCode: 202, message: 'creating' };
    entity = await this.dao.createEntity(entity);

    setImmediate(async () => {
      try {
        await this.createEntityOperation(resolvedAgent, entity);

        // Update the operationStatus and state appropriately
        entity.state = Model.EntityState.active;
        entity.operationStatus = { statusCode: 200, message: 'created' };
        entity = await this.dao.updateEntity(entity);
      } catch (err) {
        console.log(`WARNING: Failed to update ${entity.id}: `, err);
        entity.operationStatus = { statusCode: err.status || 500, message: err.message || 'Failed to apply update' };
        try {
          await this.dao.updateEntity(entity);
        } catch (e) {
          // Unable to do anything useful here...
        }
      }
    });

    // Return the entity as created with an operationStatus: 202
    return { statusCode: 202, result: entity };
  };

  public createEntityOperation = async (resolvedAgent: IAgent, entity: Model.IEntity) => {
    const params = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      boundaryId: this.entityType,
      functionId: entity.id,
    };

    const result = await Function.createFunction(params, this.createFunctionSpecification(entity), resolvedAgent);

    if (result.code === 201 && result.buildId) {
      await Function.waitForFunctionBuild(params, result.buildId, 100000);
    }
  };

  public updateEntity = async (resolvedAgent: IAgent, entity: Model.IEntity): Promise<IServiceResult> => {
    // Make sure the entity already exists.
    const preEntity = await this.dao.getEntity(entity);

    // Make sure the sanitize passes
    entity = this.sanitizeEntity(entity);

    preEntity.operationStatus = { statusCode: 202, message: 'updating' };
    await this.dao.updateEntity(preEntity);

    setImmediate(async () => {
      try {
        // Delegate to the normal create code to recreate the function.
        await this.createEntityOperation(resolvedAgent, entity);
        entity.operationStatus = { statusCode: 200, message: 'finished' };

        await this.dao.updateEntity(entity);
      } catch (err) {
        console.log(`WARNING: Failed to update ${entity.id}: `, err);
        preEntity.operationStatus = { statusCode: err.status || 500, message: err.message || 'Failed to apply update' };
        try {
          await this.dao.updateEntity(preEntity);
        } catch (e) {
          // Unable to do anything useful here...
        }
      }
    });

    return { statusCode: 200, result: preEntity };
  };

  public deleteEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    try {
      const preEntity = await this.dao.getEntity(entity);
      preEntity.state = Model.EntityState.invalid;
      preEntity.operationStatus = { statusCode: 202, message: 'updating' };
      await this.dao.updateEntity(preEntity);
    } catch (err) {
      if (err.status !== 404) {
        return { statusCode: err.status, result: err };
      }
    }

    setImmediate(async () => {
      try {
        await this.deleteEntityOperation(entity);
      } catch (err) {
        // Silently eat errors on function delete challenges.
        console.log(`WARNING: Deleting function for ${entity.id} failed with error: ${err.message}`);
      }

      try {
        // Delete it.
        await this.dao.deleteEntity(entity);
      } catch (err) {
        // Silently eat errors on removing entities from the database.
        console.log(`WARNING: Deleting ${entity.id} failed with error: ${err.message}`);
      }
    });

    return { statusCode: 204, result: {} };
  };

  public deleteEntityOperation = async (entity: Model.IEntity) => {
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
  };

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
    elements: Function.IExecuteFunctionOptions
  ): Promise<Function.IExecuteFunction> => {
    return Function.executeFunction(
      { ...entity, boundaryId: this.entityType, functionId: entity.id, version: undefined },
      method,
      location,
      elements
    );
  };
}
