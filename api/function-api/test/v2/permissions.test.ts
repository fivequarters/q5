import { Model } from '@5qtrs/db';

import { ApiRequestMap, cleanupEntities } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});
afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

const crudPermissions = async (entityType: Model.EntityType, authz: string) => {
  await expect(ApiRequestMap[entityType].get(account, 'inv', { authz })).resolves.toBeHttp({ statusCode: 403 });
  await expect(ApiRequestMap[entityType].list(account, undefined, { authz })).resolves.toBeHttp({ statusCode: 403 });
  await expect(ApiRequestMap[entityType].post(account, 'inv', { id: 'inv' }, { authz })).resolves.toBeHttp({
    statusCode: 403,
  });
  await expect(ApiRequestMap[entityType].put(account, 'inv', { id: 'inv' }, { authz })).resolves.toBeHttp({
    statusCode: 403,
  });
  await expect(ApiRequestMap[entityType].delete(account, 'inv', { authz })).resolves.toBeHttp({ statusCode: 403 });
};

const authzTests = (entityType: Model.EntityType) => {
  test('No auth causes rejection', async () => {
    await crudPermissions(entityType, '');
  }, 180000);

  test('Bad auth causes rejection', async () => {
    await crudPermissions(entityType, 'invalidjwt');
  }, 180000);
};

describe('Connector Permissions', () => {
  authzTests(Model.EntityType.connector);
});

describe('Integration Permissions', () => {
  authzTests(Model.EntityType.integration);
});
