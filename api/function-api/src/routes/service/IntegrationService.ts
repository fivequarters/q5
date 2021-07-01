import http_error from 'http-errors';

import { safePathMap } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import SessionedComponentService from './SessionedComponentService';

import * as Function from '../functions';

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

const defaultPackage = (entity: Model.IEntity) => ({
  scripts: { deploy: `"fuse integration deploy ${entity.id} -d ."`, get: `"fuse integration get ${entity.id} -d ."` },
  dependencies: { ['@fusebit-int/framework']: '^2.0.0' },
  files: ['./integration.js'], // Make sure the default file is included, if nothing else.
});

const defaultConnectorPath = '/api/configure';

const selfEntityIdReplacement = '{{integration}}';

class IntegrationService extends SessionedComponentService<Model.IIntegration, Model.IInstance> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.integration, RDS.DAO.instance);
    this.entityType = Model.EntityType.integration;
  }

  public addService = (service: SessionedComponentService<any, any>): void => {
    this.integrationService = this;
    this.connectorService = service;
  };

  public sanitizeEntity = (ent: Model.IEntity): Model.IEntity => {
    const entity = ent as Model.IIntegration;
    const data = entity.data;

    if (!data || Object.keys(data).length === 0) {
      // Default entity.data:
      entity.data = {
        handler: './integration',
        files: {
          ['integration.js']: defaultIntegration,
          ['package.json']: JSON.stringify(defaultPackage(entity), null, 2),
        },
        configuration: { connectors: {}, creation: { tags: {}, steps: [], autoStep: true } },
      };

      return entity;
    }

    // Steps are not present; deduce from connectors.
    if (!data.configuration.creation) {
      data.configuration.creation = { tags: {}, steps: [], autoStep: true };
    }

    if (
      !data.configuration.creation.steps ||
      data.configuration.creation.steps.length === 0 ||
      data.configuration.creation.autoStep
    ) {
      data.configuration.creation.steps = [];

      Object.entries(data.configuration.connectors).forEach(([connectorLabel, conn]) => {
        const connectorId = conn.connector;
        const name = connectorLabel;
        data.configuration.creation.steps.push({
          name,
          target: {
            entityType: Model.EntityType.connector,
            accountId: entity.accountId,
            subscriptionId: entity.subscriptionId,
            entityId: connectorId,
            path: defaultConnectorPath,
          },
        });
      });
    }

    // Validate DAG of 'uses' parameters, if any, and populate the path for targets.
    const dagSteps: string[] = [];
    data.configuration.creation.steps.forEach((step) => {
      dagSteps.push(step.name);
      if (!step.target.path) {
        if (step.target.entityType === Model.EntityType.connector) {
          step.target.path = defaultConnectorPath;
        } else {
          throw http_error(400, `Missing 'path' from step '${step.name}'`);
        }
      }

      if (step.target.entityId === selfEntityIdReplacement) {
        step.target.entityId = entity.id;
      }

      step.uses?.forEach((usesStep) => {
        if (!dagSteps.includes(usesStep)) {
          throw http_error(400, `Ordering violation: 'uses' in '${step.name}' for '${usesStep}' before declaration.`);
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

    return entity;
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
      security: {
        functionPermissions: {
          allow: [
            {
              action: 'storage:*',
              resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/storage/integration/{{functionId}}/',
            },
            {
              action: 'session:put',
              resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/session/',
            },
            {
              action: 'session:result',
              resource:
                '/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/session/result/',
            },
            {
              action: 'session:get',
              resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/session/',
            },
          ],
        },
      },
    };

    return spec;
  };
}

export default IntegrationService;
