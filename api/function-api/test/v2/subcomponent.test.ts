import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap, createPair } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

const performTests = (
  entityType: Model.EntityType,
  getParentId: (pair: { connectorId: string; integrationId: string }) => string
) => {
  test('Entities require data', async () => {
    const pair = await createPair(account, boundaryId);
    const response = await ApiRequestMap[entityType].post(account, getParentId(pair));
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Entities can be created', async () => {
    const pair = await createPair(account, boundaryId);
    const response = await ApiRequestMap[entityType].post(account, getParentId(pair), { data: { foo: 5 } });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Entities can be listed', async () => {
    const pair = await createPair(account, boundaryId);
    let response = await ApiRequestMap[entityType].post(account, getParentId(pair), { data: { foo: 5 } });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await ApiRequestMap[entityType].list(account, getParentId(pair));
    expect(response).toBeHttp({ statusCode: 200, data: { total: 1 } });
    expect(response.data.items).toHaveLength(1);
  }, 180000);
};

describe('Identity', () => {
  performTests(Model.EntityType.identity, (pair: { connectorId: string }) => pair.connectorId);
});

describe('Install', () => {
  performTests(Model.EntityType.install, (pair: { integrationId: string }) => pair.integrationId);
});
