import { cleanupEntities, ApiRequestMap } from './sdk';
import { getEnv } from '../v1/setup';
import { getFunction } from '../v1/sdk';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

describe('Scheduled integrations', () => {
  test('Creating an every-minute scheduled integration', async () => {
    const schedule = [{ cron: '* * * * *', endpoint: '/api/scheduled' }];
    await putScheduledIntegration(boundaryId, schedule);
    await validateIntegrationSpec(boundaryId, schedule);
  }, 180000);

  test('Creating an hourly scheduled integration', async () => {
    const schedule = [{ cron: '0 * * * *', endpoint: '/api/scheduled' }];
    await putScheduledIntegration(boundaryId, schedule);
    await validateIntegrationSpec(boundaryId, schedule);
  }, 180000);

  test('Creating a daily integration', async () => {
    const schedule = [{ cron: '15 7 * * *', endpoint: '/api/scheduled' }];
    await putScheduledIntegration(boundaryId, schedule);
    await validateIntegrationSpec(boundaryId, schedule);
  }, 180000);

  const putScheduledIntegration = async (id: string, schedule: any[]) => {
    const integrationSpec = {
      data: {
        handler: './integration.js',
        schedule,
        files: {
          ['package.json']: JSON.stringify({
            dependencies: {
              ['@fusebit-int/framework']: '4.0.1',
            },
            files: ['./integration.js'],
          }),
          ['integration.js']: [
            "const { Integration } = require('@fusebit-int/framework');",
            '',
            'const integration = new Integration();',
            'const router = integration.router;',
            '',
            "router.cron('/api/scheduled', async (ctx) => {",
            '  ctx.body = "Hi there";',
            '});',
            '',
            'module.exports = integration;',
          ].join('\n'),
        },
      },
      id,
    };
    const createIntegrationResponse = await ApiRequestMap.integration.postAndWait(account, id, integrationSpec);
    expect(createIntegrationResponse).toBeHttp({ statusCode: 200 });
  };

  const validateIntegrationSpec = async (id: string, schedule: any[]) => {
    // check v1 underneath function config
    const integrationBoundary = 'integration';
    const { data: functionSpec } = await getFunction(account, integrationBoundary, id);
    expect(functionSpec).toBeDefined();
    const v1Schedule = {
      cron: schedule[0].cron,
    };
    expect(functionSpec.schedule).toMatchObject(v1Schedule);
  };
});
