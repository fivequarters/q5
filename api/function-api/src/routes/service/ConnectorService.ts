import { Permissions, v2Permissions, safePathMap } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import SessionedComponentService from './SessionedComponentService';
import { defaultFrameworkSemver } from './BaseComponentService';

const defaultPkgOAuthConnectorSemver = '^1.0.1';

const defaultPackage = (entityId: string) => ({
  scripts: { deploy: `"fuse connector deploy ${entityId} -d ."`, get: `"fuse connector get ${entityId} -d ."` },
  dependencies: {
    '@fusebit-int/pkg-oauth-connector': defaultPkgOAuthConnectorSemver,
    '@fusebit-int/framework': defaultFrameworkSemver,
  },
});

const defaultConnector: Model.IConnectorData = {
  handler: '@fusebit-int/pkg-oauth-connector',
  configuration: {},
  files: {
    'package.json': JSON.stringify(defaultPackage('sampleConnector'), null, 2),
  },
};

class ConnectorService extends SessionedComponentService<Model.IConnector, Model.IIdentity> {
  public readonly entityType: Model.EntityType;
  constructor() {
    super(RDS.DAO.connector, RDS.DAO.identity);
    this.entityType = Model.EntityType.connector;
  }

  public addService = (service: SessionedComponentService<any, any>): void => {
    this.integrationService = service;
    this.connectorService = this;
  };

  public sanitizeEntity = (ent: Model.IEntity): Model.IEntity => {
    const entity = ent as Model.IConnector;
    const data = entity.data;

    if (!data || Object.keys(data).length === 0) {
      // Default entity.data, for the GET /?defaults=true path.
      entity.data = defaultConnector;

      return entity;
    }

    data.files = data.files || {};

    // Remove any leading . or ..'s from file paths.
    data.files = safePathMap(data.files);

    data.handler = data.handler || '@fusebit-int/pkg-oauth-connector';
    data.configuration = data.configuration || {};

    const pkg = {
      ...defaultPackage(entity.id),
      ...(data.files && data.files['package.json'] ? JSON.parse(data.files['package.json']) : {}),
    };

    pkg.dependencies['@fusebit-int/framework'] = pkg.dependencies['@fusebit-int/framework'] || defaultFrameworkSemver;

    // Make sure package mentioned in the `handler` block is also included.
    pkg.dependencies[data.handler] = pkg.dependencies[data.handler] || '*';

    // Always pretty-print package.json so it's human-readable from the start.
    data.files['package.json'] = JSON.stringify(pkg, null, 2);

    entity.data = data;

    return entity;
  };

  public getFunctionSecuritySpecification = () => ({
    functionPermissions: {
      allow: [
        {
          action: Permissions.allStorage,
          resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/storage/{{boundaryId}/{{functionId}}/',
        },
        {
          action: v2Permissions.putSession,
          resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/{{boundaryId}/{{functionId}}/session/',
        },
        {
          action: v2Permissions.getSessionResult,
          resource:
            '/account/{{accountId}}/subscription/{{subscriptionId}}/{{boundaryId}/{{functionId}}/session/result/',
        },
        {
          action: v2Permissions.getSession,
          resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/{{boundaryId}/{{functionId}}/session/',
        },
        {
          action: v2Permissions.identity.get,
          resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/connector/{{functionId}}/identity/',
        },
        {
          action: v2Permissions.identity.put,
          resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/connector/{{functionId}}/identity/',
        },
      ],
    },
  });
}

export default ConnectorService;
