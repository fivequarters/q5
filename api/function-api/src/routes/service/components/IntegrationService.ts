import http_error from 'http-errors';

import { v4 as uuidv4 } from 'uuid';

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
    throw http_error(400, 'permissions are unsupported');
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
  dependencies: { ['@fusebit-int/framework']: '^2.0.0' },
  files: ['./integration.js'], // Make sure the default file is included, if nothing else.
});

const defaultConnectorPath = '/api/configure';

class IntegrationService extends SessionedComponentService<Model.IIntegration, Model.IInstance> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.integration, RDS.DAO.instance);
    this.entityType = Model.EntityType.integration;
  }

  public addService = (service: SessionedComponentService<any, any>): void => {
    this.connectorService = service;
  };

  public sanitizeEntity = (entity: Model.IIntegration): void => {
    const data = entity.data;

    if (!data || Object.keys(data).length === 0) {
      // Default entity.data:
      entity.data = {
        handler: './integration',
        files: {
          ['integration.js']: defaultIntegration,
          ['package.json']: JSON.stringify(defaultPackage(entity), null, 2),
        },
        configuration: { connectors: {}, creation: { tags: {}, steps: {}, autoStep: true } },
      };

      return;
    }

    // Steps are not present; deduce from connectors.
    if (!data.configuration.creation) {
      data.configuration.creation = { tags: {}, steps: {}, autoStep: true };
    }

    if (!data.configuration.creation.steps || data.configuration.creation.autoStep) {
      data.configuration.creation.steps = {};

      Object.keys(data.configuration.connectors).forEach((connectorLabel) => {
        const connectorId = data.configuration.connectors[connectorLabel].connector;
        const stepName = connectorLabel;
        data.configuration.creation.steps[stepName] = {
          stepName,
          target: {
            entityType: Model.EntityType.connector,
            accountId: entity.accountId,
            subscriptionId: entity.subscriptionId,
            entityId: connectorId,
            path: defaultConnectorPath,
          },
        };
      });
    }

    // Validate DAG of 'uses' parameters, if any, and populate the path for targets.
    const dagSteps: string[] = [];
    Object.entries(data.configuration.creation.steps).forEach((step) => {
      dagSteps.push(step[0]);
      if (!step[1].target.path) {
        if (step[1].target.entityType === Model.EntityType.connector) {
          step[1].target.path = defaultConnectorPath;
        } else {
          throw http_error(400, `Missing 'path' from step '${step[0]}'`);
        }
      }

      step[1].uses?.forEach((usesStep) => {
        if (!dagSteps.includes(usesStep)) {
          throw http_error(400, `Ordering violation: 'uses' in '${step[0]}' for '${usesStep}' before declaration.`);
        }
      });
    });

    // Remove any leading . or ..'s from file paths.
    data.files = safePathMap(data.files);

    // Create the package.json.
    const pkg = {
      ...defaultPackage(entity),
      ...(data.files['package.json'] ? JSON.parse(data.files['package.json']) : defaultPackage(entity)),
    };

    // Enforce @fusebit-int/framework as a dependency.
    pkg.dependencies['@fusebit-int/framework'] = pkg.dependencies['@fusebit-int/framework'] || '^2.0.0';

    // Make sure packages mentioned in the cfg.connectors block are also included.
    Object.values(data.configuration.connectors).forEach((c: { package: string }) => {
      pkg.dependencies[c.package] = pkg.dependencies[c.package] || '*';
    });

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
    return operationService.inOperation(
      Model.EntityType.integration,
      entity,
      { verb: 'creating', type: Model.EntityType.integration },
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
      { verb: 'updating', type: Model.EntityType.integration },
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
      { verb: 'deleting', type: Model.EntityType.integration },
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
