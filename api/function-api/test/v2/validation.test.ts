import { Model } from '@5qtrs/db';

import { ApiRequestMap } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const crudValidation = async (entityType: Model.EntityType) => {
  test('Get validation', async () => {
    await expect(ApiRequestMap[entityType].get(account, 'invalid id')).resolves.toBeHttp({ statusCode: 400 });
  }, 180000);

  test('List validation passes', async () => {
    await expect(ApiRequestMap[entityType].list(account, { idPrefix: boundaryId })).resolves.toBeHttp({
      statusCode: 404, // Valid, but no entries will match
    });
  }, 180000);

  test('List validation', async () => {
    await expect(ApiRequestMap[entityType].list(account, { idPrefix: 'invalid id' })).resolves.toBeHttp({
      statusCode: 400,
    });
  }, 180000);

  test('Post validation', async () => {
    await expect(ApiRequestMap[entityType].post(account, { id: 'invalid id' })).resolves.toBeHttp({
      statusCode: 400,
    });
  }, 180000);

  test('Put validation', async () => {
    await expect(ApiRequestMap[entityType].put(account, 'inv', { id: 'invalid id' })).resolves.toBeHttp({
      statusCode: 400,
    });
  }, 180000);

  test('Put variant validation', async () => {
    await expect(ApiRequestMap[entityType].put(account, 'invalid id', { id: 'inv' })).resolves.toBeHttp({
      statusCode: 400,
    });
  }, 180000);

  test('delete validation', async () => {
    await expect(ApiRequestMap[entityType].delete(account, 'invalid id')).resolves.toBeHttp({ statusCode: 400 });
  }, 180000);
};

describe('Connector', () => {
  crudValidation(Model.EntityType.connector);
});

describe('Integration', () => {
  crudValidation(Model.EntityType.integration);
});
