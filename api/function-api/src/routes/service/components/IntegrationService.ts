import { safePathMap } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';
import { IAgent } from '@5qtrs/account-data';
import { AwsRegistry } from '@5qtrs/registry';

import { IServiceResult } from './BaseComponentService';
import SessionedComponentService from './SessionedComponentService';
import { operationService } from './OperationService';

import * as Function from '../../functions';

const rejectPermissionAgent = {
  checkPermissionSubset: () => {
    throw new Error('permissions are unsupported');
  },
};

const defaultIntegration = [
  "const { Router, Manager, Form } = require('@fusebit-int/framework');",
  '',
  'const router = new Router();',
  '',
  "router.get('/api/', async (ctx) => {",
  "  ctx.body = 'Hello World';",
  '});',
  '',
  'module.exports = router;',
].join('\n');

const defaultPackage = (entity: Model.IIntegration) => ({
  scripts: { deploy: `"fuse integration deploy ${entity.id} -d ."`, get: `"fuse integration get ${entity.id} -d ."` },
  dependencies: {},
  files: ['./integration.js'], // Make sure the default file is included, if nothing else.
});

class IntegrationService extends SessionedComponentService<Model.IIntegration> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.integration);
    this.entityType = Model.EntityType.integration;
  }

  public sanitizeEntity = (entity: Model.IIntegration): void => {
    let data = entity.data;

    if (!data) {
      data = entity.data = { handler: './integration' };
    }

    // Get the list of javascript files
    data.files = data.files || { ['integration.js']: defaultIntegration };

    // Remove any leading . or ..'s from file paths.
    data.files = safePathMap(data.files);

    const nonPackageFiles = Object.keys(data.files).filter((f) => f.match(/\.js$/));
    if (nonPackageFiles.length > 1) {
      // Many files present; key must be specified.
      if (!data.configuration || data.handler === undefined) {
        throw new Error(`A 'handler' must be specified for the integration`);
      }
    } else if (nonPackageFiles.length === 1) {
      // One file present; use that file as the integration.
      data.handler = `./${nonPackageFiles[0]}`;
      data.configuration = { connectors: {}, ...data.configuration };
    } else {
      // New integration, no files present, create some placeholders.
      data.files['integration.js'] = defaultIntegration;
      data.handler = './integration';
      data.configuration = { connectors: {}, ...data.configuration };
    }

    if (!data.configuration.connectors) {
      data.configuration.connectors = {};
    }

    // Create the package.json, making sure the framework is present, and any packages referenced in the
    // connectors block.
    const pkg = {
      ...defaultPackage(entity),
      ...(data.files && data.files['package.json'] ? JSON.parse(data.files['package.json']) : {}),
    };
    pkg.dependencies['@fusebit-int/framework'] = pkg.dependencies['@fusebit-int/framework'] || '^2.0.0';

    // Make sure packages mentioned in the cfg.connectors block are also included.
    if (data.configuration) {
      Object.values(data.configuration.connectors).forEach((c: { package: string }) => {
        pkg.dependencies[c.package] = pkg.dependencies[c.package] || '*';
      });
    }

    // Always pretty-print package.json so it's human-readable from the start.
    data.files['package.json'] = JSON.stringify(pkg, null, 2);
  };

  public createFunctionSpecification = (entity: Model.IEntity): Function.IFunctionSpecification => {
    const data = entity.data;

    // Add the baseUrl to the configuration.
    const config = {
      ...data.configuration,
      mountUrl: `/v2/account/${entity.accountId}/subscription/${entity.subscriptionId}/integration/${entity.id}`,
    };

    const spec = {
      id: entity.id,
      nodejs: {
        files: {
          ...data.files,

          // Don't allow the index.js to be overwritten.
          'index.js': [
            `const config = ${JSON.stringify(config)};`,
            `let handler = '${data.handler}';`,
            "handler = handler[0] === '.' ? `${__dirname}/${handler}`: handler;",
            `module.exports = require('@fusebit-int/framework').Handler(handler, config);`,
          ].join('\n'),
        },
      },
    };

    return spec;
  };

  public createEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.integration,
      entity,
      { verb: 'creating', type: 'integration' },
      async () => {
        this.sanitizeEntity(entity as Model.IIntegration);
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

    try {
      const result = await Function.createFunction(
        params,
        this.createFunctionSpecification(entity),
        rejectPermissionAgent as IAgent,
        AwsRegistry.create({ ...entity, registryId: 'default' })
      );

      if (result.code === 201 && result.buildId) {
        await Function.waitForFunctionBuild(params, result.buildId, 100000);
      }
    } catch (e) {
      console.log(`ERROR: createEntityOperation `, e);
      throw e;
    }
  };

  public updateEntity = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.integration,
      entity,
      { verb: 'updating', type: 'integration' },
      async () => {
        // Make sure the entity already exists.
        await this.dao.getEntity(entity);

        this.sanitizeEntity(entity as Model.IIntegration);

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
      Model.EntityType.integration,
      entity,
      { verb: 'deleting', type: 'integration' },
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

export default IntegrationService;
