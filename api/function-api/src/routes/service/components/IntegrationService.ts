import RDS, { Model } from '@5qtrs/db';
import { IAgent } from '@5qtrs/account-data';
import { AwsRegistry } from '@5qtrs/registry';

import BaseComponentService, { IServiceResult } from './BaseComponentService';
import { operationService } from './OperationService';

import * as Function from '../../functions';

const boundaryId = 'integration';

const rejectPermissionAgent = {
  checkPermissionSubset: () => {
    throw new Error('permissions are unsupported');
  },
};

interface IIntegrationConnector {
  package: string;
  config?: any;
}

interface IIntegrationEntity {
  configuration: {
    package: string;
    connectors: { [name: string]: IIntegrationConnector };
  };
  files: { [fileName: string]: string };
}

const defaultIntegration = [
  "const { Router, Manager, Form } = require('@fusebit-int/pkg-manager');",
  "const connectors = require('@fusebit-int/pkg-manager').connectors;",
  '',
  'const router = new Router();',
  '',
  "router.get('/', async (ctx) => {",
  "  ctx.body = 'Hello World';",
  '});',
  '',
  'module.exports = router;',
].join('\n');

class IntegrationService extends BaseComponentService<Model.IIntegration> {
  constructor() {
    super(RDS.DAO.integration);
  }

  public sanitizeEntity = (entity: Model.IEntity): void => {
    const data: IIntegrationEntity = entity.data;

    // Get the list of javascript files
    data.files = data.files || {};
    const nonPackageFiles = Object.keys(data.files).filter((f) => f.match(/\.js$/));
    if (nonPackageFiles.length > 1) {
      // Many files present; key must be specified.
      if (data.configuration.package === undefined) {
        throw new Error(`A 'package' must be specified in the configuration`);
      }
    } else if (nonPackageFiles.length === 1) {
      // One file present; use that file as the integration.
      data.configuration = { ...data.configuration, package: `./${nonPackageFiles[0]}` };
    } else {
      // New integration, no files present, create some placeholders.
      data.files['integration.js'] = defaultIntegration;
      data.configuration = { ...data.configuration, package: './integration' };
    }

    if (!data.configuration.connectors) {
      data.configuration.connectors = {};
    }

    // Create the package.json, making sure pkg-handler and pkg-manager are present, and any packages
    // referenced in the connectors block.
    const pkg = {
      dependencies: {},
      ...(data.files && data.files['package.json'] ? JSON.parse(data.files['package.json']) : {}),
    };
    pkg.dependencies['@fusebit-int/pkg-handler'] = pkg.dependencies['@fusebit-int/pkg-handler'] || '*';
    pkg.dependencies['@fusebit-int/pkg-manager'] = pkg.dependencies['@fusebit-int/pkg-manager'] || '*';

    // Make sure packages mentioned in the cfg.connectors block are also included.
    Object.keys(data.configuration.connectors).forEach((k: string) => {
      const packageName = data.configuration.connectors[k].package;
      pkg.dependencies[packageName] = pkg.dependencies[packageName] || '*';
    });

    data.files['package.json'] = JSON.stringify(pkg);
  };

  public createFunctionSpecification = async (entity: Model.IEntity): Promise<Function.IFunctionSpecification> => {
    const data = entity.data;
    const cfg = {
      ...data.configuration,
    };

    const spec = {
      id: entity.id,
      nodejs: {
        files: {
          ...data.files,

          // Don't allow the index.js to be overwritten.
          'index.js': [
            `const config = ${JSON.stringify(cfg)};`,
            "config.package = config.package[0] === '.' ? `${__dirname}/${config.package}`: config.package",
            `module.exports = require('@fusebit-int/pkg-handler')(config);`,
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
      async (_: Model.IEntity, operationId: string) => {
        this.sanitizeEntity(entity);
        await this.createEntityOperation(entity, operationId);
        await this.dao.createEntity(entity);
      }
    );
  };

  public createEntityOperation = async (entity: Model.IEntity, _: string) => {
    // Do update things - create functions, collect their versions, and update the entity.data object
    // appropriately.

    const params = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      boundaryId,
      functionId: entity.id,
    };

    try {
      const result = await Function.createFunction(
        params,
        await this.createFunctionSpecification(entity),
        rejectPermissionAgent as IAgent,
        AwsRegistry.create({ ...entity, registryId: 'default' })
      );

      if (result.code === 201 && result.buildId) {
        await Function.waitForFunctionBuild(params, result.buildId, 100000);
      }
    } catch (e) {
      console.log(e);
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
      async (_: Model.IEntity, operationId: string) => {
        operationId = operationId;

        // Make sure the entity already exists.
        await this.dao.getEntity(entity);

        this.sanitizeEntity(entity);

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
      Model.EntityType.integration,
      entity,
      { verb: 'deleting', type: 'integration' },
      async (_: Model.IEntity, operationId: string) => {
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

export default IntegrationService;
