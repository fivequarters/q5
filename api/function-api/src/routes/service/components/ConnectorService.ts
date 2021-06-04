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
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.connector);
    this.entityType = Model.EntityType.connector;
  }

  public sanitizeEntity = (entity: Model.IEntity): Model.IConnector => {
    const data = entity.data || {};
    data.files = data.files || {};
    data.configuration = data.configuration || { package: '@fusebit-int/pkg-oauth-connector' };
    data.configuration.package = data.configuration.package || '@fusebit-int/pkg-oauth-connector';

    const pkg = {
      dependencies: {},
      ...(data.files && data.files['package.json'] ? JSON.parse(data.files['package.json']) : {}),
    };

    pkg.dependencies['@fusebit-int/pkg-handler'] = pkg.dependencies['@fusebit-int/pkg-handler'] || '*';
    pkg.dependencies['@fusebit-int/pkg-manager'] = pkg.dependencies['@fusebit-int/pkg-manager'] || '*';

    // Make sure package mentioned in the `package` block is also included.
    pkg.dependencies[data.configuration.package] = pkg.dependencies[data.configuration.package] || '*';

    // Always pretty-print package.json so it's human-readable from the start.
    data.files['package.json'] = JSON.stringify(pkg, null, 2);

    return data;
  };

  public createFunctionSpecification = (entity: Model.IEntity): Function.IFunctionSpecification => {
    return {
      id: entity.id,
      nodejs: {
        files: {
          ...entity.data.files,
          'index.js': [
            `const config = ${JSON.stringify(entity.data.configuration)};`,
            `module.exports = require('@fusebit-int/pkg-handler')(config);`,
          ].join('\n'),
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
      async () => {
        await this.createEntityOperation(entity);
        await this.dao.createEntity(entity);
      }
    );
  };

  public createEntityOperation = async (entity: Model.IEntity) => {
    // Do update things - create functions, collect their versions, and update the entity.data object
    // appropriately.

    const params = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      boundaryId: this.entityType,
      functionId: entity.id,
    };

    entity.data = this.sanitizeEntity(entity);

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
      async () => {
        // Make sure the entity already exists.
        await this.dao.getEntity(entity);

        // Delegate to the normal create code to recreate the function.
        await this.createEntityOperation(entity);

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
}

export default ConnectorService;
