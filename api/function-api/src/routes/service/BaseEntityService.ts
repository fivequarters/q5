import { IAgent } from '@5qtrs/account-data';
import { Model } from '@5qtrs/db';

import * as Function from '../functions';

export const defaultFrameworkSemver = '5.1.0';
export const defaultOAuthConnectorSemver = '5.1.0';

export interface IServiceResult {
  statusCode: number;
  contentType?: string;
  result: any;
}

const updateOperationState = (entity: Model.IEntity, state: Model.EntityState) => state || entity.state;

const updateOperationStatus = (
  entity: Model.IEntity,
  operation: Model.OperationType,
  status: Model.OperationStatus,
  message?: string,
  errorCode?: Model.OperationErrorCode,
  errorDetails?: any
) => {
  if (!entity.operationState) {
    return { operation, status, message, errorCode, errorDetails };
  }

  const operationState = { ...entity.operationState };

  operationState.operation = operation || entity.operationState.operation;
  operationState.status = status || entity.operationState.status;
  operationState.message = message || entity.operationState.message;

  if (errorCode) {
    operationState.errorCode = errorCode;
  } else {
    delete operationState.errorCode;
  }
  if (errorDetails) {
    operationState.errorDetails = errorDetails;
  } else {
    delete operationState.errorDetails;
  }

  return operationState;
};

const guessOperationErrorCode = (error: any) => {
  if (!error) {
    return undefined;
  }

  const status: number = error.code || error.status || error.statusCode;
  if (!status) {
    return Model.OperationErrorCode.InternalError;
  }

  const errorCodeMap: Record<number, Model.OperationErrorCode> = {
    [200]: Model.OperationErrorCode.OK,
    [400]: Model.OperationErrorCode.InvalidParameterValue,
    [403]: Model.OperationErrorCode.UnauthorizedOperation,
    [409]: Model.OperationErrorCode.VersionConflict,
    [429]: Model.OperationErrorCode.RequestLimitExceeded,
  };

  return errorCodeMap[status] || Model.OperationErrorCode.InternalError;
};

const errorToOperationErrorDetails = (error: any) => {
  return error.message;
};

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

    const spec: Function.IFunctionSpecification = {
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

    if (entity.data.schedule) {
      const { cron, timezone } = entity.data.schedule[0];
      spec.schedule = {
        cron,
        timezone,
      };
    }

    return spec;
  };

  public getEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.getEntity(entity),
  });

  public createEntity = async (resolvedAgent: IAgent, entity: Model.IEntity): Promise<IServiceResult> => {
    let sanitizedEntity;
    try {
      // Create the entity
      sanitizedEntity = this.sanitizeEntity(entity);
    } catch (err) {
      return { statusCode: 400, result: err.message };
    }

    sanitizedEntity.state = updateOperationState(sanitizedEntity, Model.EntityState.creating);
    sanitizedEntity.operationState = updateOperationStatus(
      sanitizedEntity,
      Model.OperationType.creating,
      Model.OperationStatus.processing,
      `Creation of ${this.entityType} ${entity.id} is in progress`
    );

    try {
      entity = await this.dao.createEntity(sanitizedEntity);
    } catch (err) {
      return { statusCode: 400, result: err.message };
    }

    setImmediate(async () => {
      try {
        await this.createEntityOperation(resolvedAgent, entity);

        // Update the operationState and state appropriately
        entity.state = updateOperationState(entity, Model.EntityState.active);
        entity.operationState = updateOperationStatus(
          entity,
          Model.OperationType.creating,
          Model.OperationStatus.success,
          `Creation of ${this.entityType} ${entity.id} completed`
        );
      } catch (err) {
        console.log(`WARNING: Failed to create ${entity.id}: `, err);
        entity.state = updateOperationState(entity, Model.EntityState.invalid);
        entity.operationState = updateOperationStatus(
          entity,
          Model.OperationType.creating,
          Model.OperationStatus.failed,
          `Creation of ${this.entityType} ${entity.id} failed`,
          guessOperationErrorCode(err),
          errorToOperationErrorDetails(err)
        );
      }

      try {
        await this.dao.updateEntity(entity);
      } catch (e) {
        // Unable to do anything useful here...
        console.log(`ERROR: Failed to final update on 'create' entity ${entity.id}: ${e}`);
      }
    });

    // Return the entity as created with an operationState: 202
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
    let existingEntity = await this.dao.getEntity(entity);

    // Do an initial version check before it gets lost due to updating the operationState
    if (entity.version && entity.version !== existingEntity.version) {
      return { statusCode: 409, result: entity };
    }

    try {
      // Make sure the sanitize passes
      entity = this.sanitizeEntity(entity);
    } catch (err) {
      existingEntity.state = updateOperationState(existingEntity, existingEntity.state || Model.EntityState.active);
      existingEntity.operationState = updateOperationStatus(
        existingEntity,
        Model.OperationType.updating,
        Model.OperationStatus.failed,
        `Updating of ${this.entityType} ${entity.id} failed`,
        Model.OperationErrorCode.InvalidParameterValue,
        errorToOperationErrorDetails(err)
      );
      existingEntity = await this.dao.updateEntity(existingEntity);
      return { statusCode: 200, result: existingEntity };
    }

    existingEntity.state = updateOperationState(existingEntity, existingEntity.state || Model.EntityState.active);
    existingEntity.operationState = updateOperationStatus(
      existingEntity,
      Model.OperationType.updating,
      Model.OperationStatus.processing,
      `Updating ${this.entityType} ${entity.id}`
    );
    existingEntity = await this.dao.updateEntity(existingEntity);

    // Update the version to match the new version in the operationState
    if (entity.version) {
      entity.version = existingEntity.version;
    }

    setImmediate(async () => {
      let resultEntity = entity;
      try {
        // Delegate to the normal create code to recreate the function.
        await this.createEntityOperation(resolvedAgent, entity);
        entity.state = updateOperationState(entity, Model.EntityState.active);
        entity.operationState = updateOperationStatus(
          entity,
          Model.OperationType.updating,
          Model.OperationStatus.success,
          `Updated ${this.entityType} ${entity.id}`
        );
        resultEntity = entity;
      } catch (err) {
        existingEntity.state = updateOperationState(existingEntity, existingEntity.state || Model.EntityState.active);
        existingEntity.operationState = updateOperationStatus(
          existingEntity,
          Model.OperationType.updating,
          Model.OperationStatus.failed,
          `Updating of ${this.entityType} ${entity.id} failed`,
          guessOperationErrorCode(err),
          errorToOperationErrorDetails(err)
        );
        resultEntity = existingEntity;
      }

      try {
        await this.dao.updateEntity(resultEntity);
      } catch (e) {
        // Unable to do anything useful here...
        console.log(`ERROR: Failed to final update on 'update' entity ${entity.id}: ${e}`);
      }
    });

    return { statusCode: 200, result: existingEntity };
  };

  public deleteEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    let existingEntity: Model.IEntity;

    try {
      existingEntity = await this.dao.getEntity(entity);

      if (entity.version && entity.version !== existingEntity.version) {
        return { statusCode: 409, result: entity };
      }

      existingEntity.state = updateOperationState(existingEntity, existingEntity.state || Model.EntityState.invalid);
      existingEntity.operationState = updateOperationStatus(
        existingEntity,
        Model.OperationType.deleting,
        Model.OperationStatus.processing,
        `Deleting ${this.entityType} ${entity.id}`
      );

      existingEntity = await this.dao.updateEntity(existingEntity);
    } catch (err) {
      return { statusCode: err.status, result: err };
    }

    if (entity.version) {
      entity.version = existingEntity.version;
    }

    setImmediate(async () => {
      try {
        // Delete it.
        await this.dao.deleteEntity(entity);
      } catch (err) {
        // Eat errors and leave things alone - likely due to a version conflict.
        console.log(`WARNING: Deleting entity for ${entity.id} failed with error: ${err.status}/${err.message}`);
        return;
      }

      try {
        await this.deleteEntityOperation(entity);
      } catch (err) {
        // Silently eat errors on function delete challenges.
        console.log(`WARNING: Deleting function for ${entity.id} failed with error: ${err.status}/${err.message}`);
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

  public getEntityTag = async (entityKey: Model.IEntityKeyTagSet): Promise<string | null> => {
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
