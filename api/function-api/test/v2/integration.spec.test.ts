import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap, RequestMethod } from './sdk';
import { getEnv } from '../v1/setup';

// Pull from function.utils so that keyStore.shutdown() and terminate_garbage_collection() get run, otherwise
// the jest process hangs.
import { defaultFrameworkSemver } from '../v1/function.utils';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

const testSpec = async (entity: Model.ISdkEntity, nodeVersionRegex: RegExp) => {
  const createIntegrationResponse = await ApiRequestMap.integration.postAndWait(account, entity.id, entity);
  expect(createIntegrationResponse).toBeHttp({ statusCode: 200 });

  const versionResponse = await ApiRequestMap.integration.dispatch(
    account,
    entity.id,
    RequestMethod.get,
    '/api/version'
  );
  expect(versionResponse.data).toMatch(nodeVersionRegex);
};

const getIntegrationEntity = (nodeVersion: string) => {
  return {
    data: {
      handler: './integrationTest.js',
      files: {
        'package.json': JSON.stringify({
          scripts: {},
          dependencies: {
            '@fusebit-int/framework': defaultFrameworkSemver,
          },
          files: ['./integrationTest.js'],
          engines: {
            node: nodeVersion,
          },
        }),
        'integrationTest.js': [
          "const { Integration } = require('@fusebit-int/framework');",
          '',
          'const integration = new Integration();',
          'const router = integration.router;',
          '',
          "router.get('/api/version', async (ctx) => {",
          '  ctx.body = process.version;',
          '});',
          '',
          'module.exports = integration;',
        ].join('\n'),
      },
    },
    id: boundaryId,
  };
};

describe('Integration spec test suite', () => {
  test('Integration created with supported node.js version 14', async () => {
    await testSpec(getIntegrationEntity('14'), /^v14/);
  }, 180000);

  test('Integration created with supported node.js version 12', async () => {
    await testSpec(getIntegrationEntity('12'), /^v12/);
  }, 180000);

  test('Creating integration with an invalid spec returns 400', async () => {
    const simpleBadInteg = {
      id: boundaryId,
      data: {
        handler: './integration',
        files: {
          'integration.js': "module.exports = new (require('@fusebit-int/framework').Integration)();",
          'package.json': 'XXXXXXX',
        },
      },
    };
    const response = await ApiRequestMap.integration.post(account, boundaryId, simpleBadInteg);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Updating integration with an invalid spec errors', async () => {
    const simpleInteg = {
      id: boundaryId,
      data: {
        handler: './integration',
        files: {
          'integration.js': "module.exports = new (require('@fusebit-int/framework').Integration)();",
        },
      },
    };
    let response = await ApiRequestMap.integration.postAndWait(account, boundaryId, simpleInteg);
    expect(response).toBeHttp({ statusCode: 200 });

    (simpleInteg.data.files as any)['package.json'] = 'XXX XXX';
    response = await ApiRequestMap.integration.put(account, boundaryId, simpleInteg);
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        state: Model.EntityState.active,
        operationState: {
          operation: Model.OperationType.updating,
          status: Model.OperationStatus.failed,
          errorCode: Model.OperationErrorCode.InvalidParameterValue,
        },
      },
    });
  }, 180000);

  test('Validate component default entityId', async () => {
    const simpleInteg = {
      id: boundaryId,
      data: {
        handler: './integration',
        files: {
          'integration.js': "module.exports = new (require('@fusebit-int/framework').Integration)();",
        },
        components: [
          {
            name: 'form',
            entityType: Model.EntityType.integration,
            dependsOn: [],
            path: '/dummy/path',
          },
        ],
      },
    };
    const response = await ApiRequestMap.integration.postAndWait(account, boundaryId, simpleInteg);
    expect(response).toBeHttp({ statusCode: 200 });

    expect(response.data.data.components[0].entityId).toBe(response.data.id);
  }, 180000);
});
