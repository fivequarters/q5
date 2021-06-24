import { safePathMap } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import SessionedComponentService from './SessionedComponentService';

import * as Function from '../../functions';

const defaultPackage = (entity: Model.IEntity) => ({
  scripts: { deploy: `"fuse connector deploy ${entity.id} -d ."`, get: `"fuse connector get ${entity.id} -d ."` },
  dependencies: {},
});

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

  public sanitizeEntity = (entity: Model.IEntity): Model.IEntity => {
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

    entity.data = data;

    return entity;
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
              resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/storage/connector/{{functionId}}/',
            },
            {
              action: 'session:put',
              resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/connector/{{functionId}}/session/',
            },
            {
              action: 'session:result',
              resource:
                '/account/{{accountId}}/subscription/{{subscriptionId}}/connector/{{functionId}}/session/result/',
            },
            {
              action: 'session:get',
              resource: '/account/{{accountId}}/subscription/{{subscriptionId}}/connector/{{functionId}}/session/',
            },
          ],
        },
      },
    };
  };
}

export default ConnectorService;
