import { cleanupEntities, ApiRequestMap, createPair } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});
afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

describe('Instance', () => {
  test('Delete an instance', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    let response = await ApiRequestMap.instance.post(account, integrationId, { data: {} });
    expect(response).toBeHttp({ statusCode: 200 });
    const entityId = response.data.id;
    response = await ApiRequestMap.instance.get(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await ApiRequestMap.instance.delete(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 204 });
    response = await ApiRequestMap.instance.get(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 404 });
    response = await ApiRequestMap.instance.delete(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);
});

describe('Identity', () => {
  test('Delete an identity', async () => {
    const { connectorId } = await createPair(account, boundaryId);
    let response = await ApiRequestMap.identity.post(account, connectorId, { data: {} });
    expect(response).toBeHttp({ statusCode: 200 });
    const entityId = response.data.id;
    response = await ApiRequestMap.identity.get(account, connectorId, entityId);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await ApiRequestMap.identity.delete(account, connectorId, entityId);
    expect(response).toBeHttp({ statusCode: 204 });
    response = await ApiRequestMap.identity.get(account, connectorId, entityId);
    expect(response).toBeHttp({ statusCode: 404 });
    response = await ApiRequestMap.instance.delete(account, connectorId, entityId);
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);
});
