import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap } from './sdk';
import { getEnv } from '../v1/setup';
import { IAccount } from './accountResolver';

let { account, boundaryId, function1Id, function2Id, function3Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

const testSpec = async (account: IAccount, entity: Model.ISdkEntity, nodeVersionRegex: RegExp) => {
  const createIntegrationResponse = await ApiRequestMap.integration.postAndWait(account, entity);
  expect(createIntegrationResponse).toBeHttp({ statusCode: 200 });

  const versionResponse = await ApiRequestMap.integration.dispatch(account, entity.id, 'GET', '/api/version');
  expect(versionResponse.data).toMatch(nodeVersionRegex);
};

const getIntegrationEntity = (integrationId: string, nodeVersion: string) => {
  return {
    data: {
      handler: './integrationTest.js',
      files: {
        ['package.json']: JSON.stringify({
          scripts: {},
          dependencies: {
            ['@fusebit-int/framework']: '^3.0.2',
          },
          files: ['./integrationTest.js'],
          engines: {
            node: nodeVersion,
          },
        }),
        ['integrationTest.js']: [
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
    id: `${boundaryId}-${integrationId}-${Math.floor(Math.random() * 99999999).toString(8)}`,
  };
};

describe('Integration spec test suite', () => {
  test('Integration created with supported node.js version 14', async () => {
    await testSpec(account, getIntegrationEntity(function1Id, '14'), /^v14/);
  }, 180000);

  test('Integration created with supported node.js version 12', async () => {
    await testSpec(account, getIntegrationEntity(function2Id, '12'), /^v12/);
  }, 180000);

  test('Integration created with supported node.js version 10', async () => {
    await testSpec(account, getIntegrationEntity(function3Id, '10'), /^v10/);
  }, 180000);
});
