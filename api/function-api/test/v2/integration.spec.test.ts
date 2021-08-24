import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap } from './sdk';
import { getEnv } from '../v1/setup';
import { IAccount } from './accountResolver';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
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

const getIntegrationEntity = (nodeVersion: string) => {
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
    id: boundaryId,
  };
};

describe('Integration spec test suite', () => {
  test('Integration created with supported node.js version 14', async () => {
    await testSpec(account, getIntegrationEntity('14'), /^v14/);
  }, 180000);

  test('Integration created with supported node.js version 12', async () => {
    await testSpec(account, getIntegrationEntity('12'), /^v12/);
  }, 180000);

  test('Integration created with supported node.js version 10', async () => {
    await testSpec(account, getIntegrationEntity('10'), /^v10/);
  }, 180000);
});
