import RDS, { Model } from '@5qtrs/db';
import { IAgent } from '@5qtrs/account-data';
import { AwsRegistry } from '@5qtrs/registry';

import BaseComponentService from './BaseComponentService';
import { IOperationResult, operationService } from './OperationService';

import * as Function from '../../functions';

const boundaryId = 'connector';
const standardFunctionSpecification: Function.IFunctionSpecification = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
};

const rejectPermissionAgent = {
  checkPermissionSubset: () => {
    throw new Error('permissions are unsupported');
  },
};

class ConnectorService extends BaseComponentService<Model.IConnector> {
  constructor() {
    super(RDS.DAO.connector);
  }

  public createFunctionSpecification = async (entity: Model.IEntity): Promise<Function.IFunctionSpecification> => {
    return {
      ...standardFunctionSpecification,
      ...entity.data,
      id: entity.id,
    };
  };

  public createEntity = async (entity: Model.IEntity) => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'creating', type: 'connector' },
      async (operationId: string) => {
        operationId = operationId;
        // Do update things - create functions, collect their versions, and update the entity.data object
        // appropriately.

        const params = {
          accountId: entity.accountId,
          subscriptionId: entity.subscriptionId,
          boundaryId, // XXX Move to Constants
          functionId: entity.id,
        };

        const result = await Function.createFunction(
          params,
          await this.createFunctionSpecification(entity),
          rejectPermissionAgent as IAgent,
          AwsRegistry.create({ ...entity, registryId: 'default' })
        );

        if (result.code === 201 && result.buildId) {
          await Function.waitForFunctionBuild(params, result.buildId, 100000);
        }

        await this.dao.createEntity(entity);
      }
    );
  };

  public updateEntity = async (entity: Model.IEntity): Promise<IOperationResult> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'updating', type: 'connector' },
      async (operationId: string) => {
        operationId = operationId;
        // Do update things - create functions, collect their versions, and update the entity.data object
        // appropriately.

        // Delta between the two
        // Create a new function specification
        // Publish the function

        // Update it.
        await this.dao.updateEntity(entity);
      }
    );
  };

  public deleteEntity = async (entity: Model.IEntity): Promise<IOperationResult> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'deleting', type: 'connector' },
      async (operationId: string) => {
        operationId = operationId;
        // Do delete things - create functions, collect their versions, and update the entity.data object
        // appropriately.
        await Function.deleteFunction({
          accountId: entity.accountId,
          subscriptionId: entity.subscriptionId,
          boundaryId,
          functionId: entity.id,
        });

        // Delete it.
        await this.dao.deleteEntity(entity);
      }
    );
  };
}

export default ConnectorService;
