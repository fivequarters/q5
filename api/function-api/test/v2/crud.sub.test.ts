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

const createParentEntity = async (entityType: Model.EntityType, entityId: string) => {
  let response;
  let parentEntityType: Model.EntityType;

  if (entityType === Model.EntityType.install) {
    parentEntityType = Model.EntityType.integration;
    response = await ApiRequestMap.integration.postAndWait(account, entityId, {
      id: entityId,
      data: {
        handler: './integration',
        files: {
          'integration.js': [
            "const { Integration } = require('@fusebit-int/framework');",
            'const integration = new Integration();',
            "integration.router.get('/api/', async (ctx) => { });",
            'module.exports = integration;',
          ].join('\n'),
        },
      },
    });
  } else {
    parentEntityType = Model.EntityType.connector;
    response = await ApiRequestMap.connector.postAndWait(account, entityId, { id: entityId, data: {} });
  }
  expect(response).toBeHttp({ statusCode: 200 });

  return { parentEntityId: entityId, parentEntityType };
};

const createSubEntity = async (entityType: Model.EntityType, entityId: string) => {
  const response = await ApiRequestMap[entityType].post(account, entityId, {
    data: { version: 1 },
    tags: { [entityId]: 'bar', ['test.createSubEntityTag']: true },
  });
  expect(response).toBeHttp({ statusCode: 200 });

  return response.data.id;
};

const testEntitySearchSingle = async (entityType: Model.EntityType) => {
  const numSubEntities = 5;
  const { parentEntityId, parentEntityType } = await createParentEntity(entityType, boundaryId);
  const subIds = await Promise.all(
    Array(numSubEntities)
      .fill(0)
      .map(() => createSubEntity(entityType, parentEntityId))
  );

  let response = await ApiRequestMap[entityType].search(account);
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.items.length).toBeGreaterThan(numSubEntities - 1);
  response.data.items.forEach((item: { id: string; parentId: string }) => {
    expect(item.id).toMatch(/^(idn|ins)/);
  });

  response = await ApiRequestMap[entityType].search(account, { tag: [{ tagKey: 'test.createSubEntityTag' }] });
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.items.length).toBe(numSubEntities);
  response.data.items.forEach((item: { id: string; parentId: string }) => {
    expect(item.id).toMatch(/^(idn|ins)/);
    expect(item.parentId).toBe(parentEntityId);
  });

  await ApiRequestMap[parentEntityType].deleteAndWait(account, parentEntityId);
};

const testEntitySearch = async (entityType: Model.EntityType) => {
  // Test twice to make sure parent entity deletion is handled correctly
  await testEntitySearchSingle(entityType);
  await testEntitySearchSingle(entityType);
};

describe('Install', () => {
  test('Put an install', async () => testEntityPut(Model.EntityType.install), 180000);
  test('Global search for an install', async () => testEntitySearch(Model.EntityType.install), 180000);

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
  test('Global search for an identity', async () => testEntitySearch(Model.EntityType.identity), 180000);
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
