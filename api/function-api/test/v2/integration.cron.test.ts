import { cleanupEntities, ApiRequestMap, v2Request, IRequestOptions, RequestMethod } from './sdk';
import { getEnv } from '../v1/setup';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

const getScheduledIntegration = () => {
  return {
    data: {
      handler: './integrationTest.js',
      schedule: [
        {
          cron: '* * * * *',
          endpoint: '/api/scheduled',
        },
      ],
      files: {
        ['package.json']: JSON.stringify({
          scripts: {},
          dependencies: {
            ['@fusebit-int/framework']: '4.0.1',
          },
          files: ['./integrationTest.js'],
        }),
        ['integrationTest.js']: [
          "const { Integration } = require('@fusebit-int/framework');",
          '',
          'const integration = new Integration();',
          'const router = integration.router;',
          '',
          "router.cron('/api/scheduled', async (ctx) => {",
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

describe('Scheduled integrations', () => {
  test('Creating a scheduled integration', async () => {
    // create a scheduled integration
    const scheduledIntegration = getScheduledIntegration();
    const createIntegrationResponse = await ApiRequestMap.integration.postAndWait(
      account,
      scheduledIntegration.id,
      scheduledIntegration
    );
    expect(createIntegrationResponse).toBeHttp({ statusCode: 200 });

    // check its definition
    const requestOptions: IRequestOptions = {
      uri: `/integration/${scheduledIntegration.id}`,
      method: RequestMethod.get,
    };
    const { data: responseBody } = await v2Request(account, requestOptions);
    expect(responseBody).toBeDefined();

    const { data: integrationSpec } = responseBody;

    expect(integrationSpec).toBeDefined();
    expect(integrationSpec.schedule).toBeDefined();
    expect(integrationSpec.schedule.cron).toBe(scheduledIntegration.data.schedule[0].cron);
  }, 180000);
});
