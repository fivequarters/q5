import { Model } from '@5qtrs/db';

import { cleanupEntities, ApiRequestMap } from './sdk';
import { callFunction, getFunctionLocation } from '../v1/sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const crudPermissions = (entityType: Model.EntityType) => {
  test('Permissions required for get', async () => {
    expect(ApiRequestMap[entityType].get(account, 'invalid', { authz: '' })).resolves.toBeHttp({ statusCode: 403 });
  }, 180000);
};

describe('Connector Permissions', () => {
  crudPermissions(Model.EntityType.connector);
});
