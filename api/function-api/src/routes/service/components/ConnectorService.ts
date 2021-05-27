import RDS, { Model } from '@5qtrs/db';
import { IAgent } from '@5qtrs/account-data';
import { AwsRegistry } from '@5qtrs/registry';

import BaseComponentService, { IServiceResult } from './BaseComponentService';
import { operationService } from './OperationService';

import * as Function from '../../functions';

const rejectPermissionAgent = {
  checkPermissionSubset: () => {
    throw new Error('permissions are unsupported');
  },
};

class ConnectorService extends BaseComponentService<Model.IConnector> {
  constructor() {
    super(RDS.DAO.connector, 'connector');
  }

  public createFunctionSpecification = (entity: Model.IEntity): Function.IFunctionSpecification => {
    return {
      id: entity.id,
      nodejs: {
        files: {
          'package.json': JSON.stringify({
            dependencies: {
              '@fusebit-int/pkg-handler': '*',
              '@fusebit-int/pkg-oauth-connector': '*',
            },
          }),
          'index.js': `
            const config = ${JSON.stringify({
              ...entity.data,
              package: '@fusebit-int/pkg-oauth-connector', // XXX Needs to be parameterized
            })};
            module.exports = require('@fusebit-int/pkg-handler')(config);
          `,
        },
      },
    };
  };

  public createEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'creating', type: 'connector' },
      async (_: Model.IEntity, operationId: string) => {
        await this.createEntityOperation(entity, operationId);
        await this.dao.createEntity(entity);
      }
    );
  };

  public createEntityOperation = async (entity: Model.IEntity, operationId: string) => {
    operationId = operationId;
    // Do update things - create functions, collect their versions, and update the entity.data object
    // appropriately.

    const params = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      boundaryId: this.boundaryId,
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
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'updating', type: 'connector' },
      async (_: Model.IEntity, operationId: string) => {
        operationId = operationId;

        // Make sure the entity already exists.
        await this.dao.getEntity(entity);

        // Delegate to the normal create code to recreate the function.
        await this.createEntityOperation(entity, operationId);

        // Update it.
        await this.dao.updateEntity(entity);
      }
    );
  };

  public deleteEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'deleting', type: 'connector' },
      async (_: Model.IEntity, operationId: string) => {
        operationId = operationId;
        // Do delete things - create functions, collect their versions, and update the entity.data object
        // appropriately.
        await Function.deleteFunction({
          accountId: entity.accountId,
          subscriptionId: entity.subscriptionId,
          boundaryId: this.boundaryId,
          functionId: entity.id,
        });

        // Delete it.
        await this.dao.deleteEntity(entity);
      }
    );
  };
}

export default ConnectorService;
