import { Model } from '@5qtrs/db';

import { cleanupEntities, ApiRequestMap } from './sdk';
import { callFunction, getFunctionLocation } from '../v1/sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const crudPermissions = (entityType: Model.EntityType, authz: string) => {
  expect(ApiRequestMap[entityType].get(account, 'inv', { authz })).resolves.toBeHttp({ statusCode: 403 });
  expect(ApiRequestMap[entityType].list(account, undefined, { authz })).resolves.toBeHttp({ statusCode: 403 });
  expect(ApiRequestMap[entityType].post(account, { id: 'inv' }, { authz })).resolves.toBeHttp({
    statusCode: 403,
  });
  expect(ApiRequestMap[entityType].put(account, 'inv', { id: 'inv' }, { authz })).resolves.toBeHttp({
    statusCode: 403,
  });
  expect(ApiRequestMap[entityType].delete(account, 'inv', { authz })).resolves.toBeHttp({ statusCode: 403 });
};

const authzTests = (entityType: Model.EntityType) => {
  test('No auth causes rejection', async () => {
    crudPermissions(entityType, '');
  }, 180000);

  test('Bad auth causes rejection', async () => {
    crudPermissions(entityType, 'invalidjwt');
  }, 180000);
};

describe('Connector Permissions', () => {
  authzTests(Model.EntityType.connector);
});

describe('Integration Permissions', () => {
  authzTests(Model.EntityType.integration);
});
