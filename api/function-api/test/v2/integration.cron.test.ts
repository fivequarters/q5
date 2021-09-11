import { cleanupEntities, ApiRequestMap } from './sdk';
import { getEnv } from '../v1/setup';
import { getFunction, getStorage } from '../v1/sdk';

import { defaultFrameworkSemver } from '../../src/routes/service/BaseEntityService';

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
    await validateIntegrationScheduledRun();
    await validateIntegrationSpec(boundaryId, schedule);
  }, 180000);

  test('Creating an hourly scheduled integration', async () => {
    const schedule = [{ cron: '0 * * * *', endpoint: '/api/scheduled' }];
    await putScheduledIntegration(boundaryId, schedule);
    await validateIntegrationSpec(boundaryId, schedule);
  }, 180000);

  const putScheduledIntegration = async (id: string, schedule: any[]) => {
    const integrationSpec = {
      data: {
        handler: './integration.js',
        schedule,
        files: {
          'package.json': JSON.stringify(packageJson),
          'integration.js': getIntegrationCode(account),
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

  const validateIntegrationScheduledRun = async () => {
    const oneMinuteFromNow = new Date(Date.now() + 60000);
    let lastResponse: any = { status: 404 };
    while (lastResponse.status === 404 && oneMinuteFromNow.getTime() > Date.now()) {
      lastResponse = await getStorage(account, `integration/${boundaryId}/`);
    }
    expect(lastResponse.status).toBe(200);
    expect(lastResponse.data.data.boundaryId).toBe(boundaryId);
  };
});

const getIntegrationCode = ({ accountId, subscriptionId }: typeof account) => {
  const baseUrl =
    account.baseUrl.includes('://localhost') && process.env.LOGS_HOST
      ? `https://${process.env.LOGS_HOST}`
      : account.baseUrl;

  return `
    const superagent = require("superagent");
    
    const { Integration } = require('@fusebit-int/framework');
    
    const integration = new Integration();
    const router = integration.router;
    
    router.cron('/api/scheduled', async (ctx) => {
      const storageUrl = '${baseUrl}/v1/account/${accountId}/subscription/${subscriptionId}/storage/integration/${boundaryId}/';
      const token = ctx.state.params.functionAccessToken;

      await superagent
        .put(storageUrl)
        .set("authorization", \`bearer \$\{token\}\`)
        .set("content-type", "application/json")
        .send({ data: { boundaryId: '${boundaryId}' } });

      ctx.body = "Hi there";
    });
    
    module.exports = integration;
  `;
};

const packageJson = {
  dependencies: {
    '@fusebit-int/framework': defaultFrameworkSemver,
    superagent: '^6.1.0',
  },
  files: ['./integration.js'],
};
