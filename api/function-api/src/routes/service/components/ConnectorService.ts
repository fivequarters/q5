import { safePathMap } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';
import { IAgent } from '@5qtrs/account-data';
import { AwsRegistry } from '@5qtrs/registry';

import BaseComponentService, { IServiceResult } from './BaseComponentService';
import { operationService } from './OperationService';

import * as Function from '../../functions';

const rejectPermissionAgent = {
  checkPermissionSubset: () => {
    console.log(`XXX Temporary Grant-all on Permissions Until Finalized`);
    return Promise.resolve();
  },
};

const defaultPackage = (entity: Model.IEntity) => ({
  scripts: { deploy: `"fuse connector deploy ${entity.id} -d ."`, get: `"fuse connector get ${entity.id} -d ."` },
  dependencies: {},
});

class ConnectorService extends BaseComponentService<Model.IConnector> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.connector);
    this.entityType = Model.EntityType.connector;
  }

  public sanitizeEntity = (entity: Model.IEntity): Model.IConnector => {
    const data = entity.data || {};
    data.files = data.files || {};

    // Remove any leading . or ..'s from file paths.
    data.files = safePathMap(data.files);

    data.handler = data.handler || '@fusebit-int/pkg-oauth-connector';
    data.configuration = data.configuration || {};

    const pkg = {
      ...defaultPackage(entity),
      ...(data.files && data.files['package.json'] ? JSON.parse(data.files['package.json']) : {}),
    };

    pkg.dependencies['@fusebit-int/framework'] = pkg.dependencies['@fusebit-int/framework'] || '^2.0.0';

    // Make sure package mentioned in the `handler` block is also included.
    pkg.dependencies[data.handler] = pkg.dependencies[data.handler] || '*';

    // Always pretty-print package.json so it's human-readable from the start.
    data.files['package.json'] = JSON.stringify(pkg, null, 2);

    return data;
  };

  public createFunctionSpecification = (entity: Model.IEntity): Function.IFunctionSpecification => {
    const data = entity.data;

    // Add the baseUrl to the configuration.
    const config = {
      ...entity.data.configuration,
      mountUrl: `/v2/account/${entity.accountId}/subscription/${entity.subscriptionId}/connector/${entity.id}`,
    };

    return {
      id: entity.id,
      nodejs: {
        files: {
          ...data.files,

          'index.js': [
            `const config = ${JSON.stringify(config)};`,
            `const handler = '${data.handler}';`,
            `module.exports = require('@fusebit-int/framework').Handler(handler, config);`,
          ].join('\n'),
        },
      },
      security: {
        functionPermissions: {
          allow: [
            {
              action: 'storage:*',
              resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/storage/{{boundaryId}}/{{functionId}}/',
            },
          ],
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
