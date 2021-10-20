import { Model } from '@5qtrs/db';

import { cleanupEntities, ApiRequestMap, createPair } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

const testEntityPut = async (entityType: Model.EntityType) => {
  const { integrationId, connectorId } = await createPair(account, boundaryId);
  const parentEntityId = entityType === Model.EntityType.install ? integrationId : connectorId;
  let response = await ApiRequestMap[entityType].post(account, parentEntityId, { data: { version: 1 } });
  expect(response).toBeHttp({ statusCode: 200 });
  const entityId = response.data.id;

  response = await ApiRequestMap[entityType].put(account, parentEntityId, entityId, { data: { version: 2 } });
  expect(response).toBeHttp({ statusCode: 200 });

  response = await ApiRequestMap[entityType].get(account, parentEntityId, entityId);
  expect(response).toBeHttp({ statusCode: 200, data: { data: { version: 2 } } });
};

describe('Install', () => {
  test('Put an install', async () => testEntityPut(Model.EntityType.install), 180000);

  test('Delete an install', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    let response = await ApiRequestMap.install.post(account, integrationId, { data: {} });
    expect(response).toBeHttp({ statusCode: 200 });
    const entityId = response.data.id;
    response = await ApiRequestMap.install.get(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await ApiRequestMap.install.delete(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 204 });
    response = await ApiRequestMap.install.get(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 404 });
    response = await ApiRequestMap.install.delete(account, integrationId, entityId);
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);
});

describe('Identity', () => {
  test('Put an identity', async () => testEntityPut(Model.EntityType.identity), 180000);
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
    response = await ApiRequestMap.install.delete(account, connectorId, entityId);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);
});
