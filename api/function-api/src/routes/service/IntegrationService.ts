import http_error from 'http-errors';

import { Permissions, v2Permissions, safePathMap } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import SessionedEntityService from './SessionedEntityService';
import { defaultFrameworkSemver } from './BaseEntityService';

const defaultIntegrationJs = [
  "const { Integration } = require('@fusebit-int/framework');",
  '',
  'const integration = new Integration();',
  'const router = integration.router;',
  '',
  "router.get('/api/', async (ctx) => {",
  "  ctx.body = 'Hello World';",
  '});',
  '',
  'module.exports = integration;',
].join('\n');

const defaultPackageJson = (entityId: string) => ({
  scripts: { deploy: `fuse integration deploy ${entityId} -d .`, get: `fuse integration get ${entityId} -d .` },
  dependencies: {
    ['@fusebit-int/framework']: defaultFrameworkSemver,
  },
  files: ['./integration.js'], // Make sure the default file is included, if nothing else.
});

const defaultIntegration: Model.IIntegrationData = {
  files: {
    ['integration.js']: defaultIntegrationJs,
    ['package.json']: JSON.stringify(defaultPackageJson('sampleIntegration'), null, 2),
  },
  handler: './integration',
  configuration: {},
  componentTags: {},
  components: [],
};

const selfEntityIdReplacement = '{{integration}}';

class IntegrationService extends SessionedEntityService<Model.IIntegration, Model.IInstance> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.integration, RDS.DAO.instance);
    this.entityType = Model.EntityType.integration;
  }

  public addService = (service: SessionedEntityService<any, any>): void => {
    this.integrationService = this;
    this.connectorService = service;
  };

  public sanitizeEntity = (ent: Model.IEntity): Model.IEntity => {
    const entity = ent as Model.IIntegration;
    const data = entity.data;

    if (!data || Object.keys(data).length === 0) {
      // Default entity.data, for the GET /?defaults=true path.
      entity.data = defaultIntegration;

      return entity;
    }

    // Remove any leading . or ..'s from file paths.
    // TODO: Figure out how to move this into the validation phase instead of here.
    data.files = safePathMap(data.files);

    // Create the package.json.
    const pkg = {
      ...defaultPackageJson(entity.id),
      ...(data.files['package.json'] ? JSON.parse(data.files['package.json']) : {}),
    };

    // Enforce @fusebit-int/framework as a dependency.
    pkg.dependencies['@fusebit-int/framework'] = pkg.dependencies['@fusebit-int/framework'] || defaultFrameworkSemver;

    // Validate the components in the integration, and adjust the dependencies in the package.json if
    // necessary.
    const dagList: { [key: string]: boolean } = {};
    data.components.forEach((comp: Model.IIntegrationComponent) => {
      dagList[comp.name] = true;
      // Validate DAG of 'dependsOn' parameters.
      comp.dependsOn.forEach((dep: string) => {
        if (!dagList[dep]) {
          throw http_error(400, `Ordering violation: 'dependsOn' in '${comp.name}' for '${dep}' before declaration.`);
        }
      });

      // Make sure packages mentioned in the cfg.connectors block are also included.
      if (comp.provider) {
        pkg.dependencies[comp.provider] = pkg.dependencies[comp.provider] || '*';
      }

      // Substitute the selfEntityIdReplacement for the current integration id.
      if (comp.entityId === selfEntityIdReplacement) {
        comp.entityId = entity.id;
      }
    });

    // Always pretty-print package.json so it's human-readable from the start.
    data.files['package.json'] = JSON.stringify(pkg, null, 2);

    return entity;
  };

  public getFunctionSecuritySpecification = (entity: Model.IEntity) => {
    const integ = entity as Model.IIntegration;

    const permissions = {
      authentication: 'optional',
      functionPermissions: {
        allow: [
          {
            action: Permissions.allStorage,
            resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/storage/integration/{{functionId}}/',
          },
          {
            action: v2Permissions.putSession,
            resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/session/',
          },
          {
            action: v2Permissions.getSession,
            resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/session/',
          },
        {
          action: v2Permissions.instance.all,
          resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/instance/',
        },
        ],
      },
    };

    // Allow an integration to use connector:execute on it's associated connectors.
    integ.data.components
      .filter((component) => component.entityType === Model.EntityType.connector)
      .forEach((component) => {
        permissions.functionPermissions.allow.push({
          action: v2Permissions.connector.execute,
          resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/connector/${component.entityId}/`,
        });
      });
    return permissions;
  };
}

export default IntegrationService;
