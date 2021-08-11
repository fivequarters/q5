import { Model } from '@5qtrs/db';

import { Permissions, v2Permissions } from '@5qtrs/constants';

import { ApiRequestMap, cleanupEntities, createPair } from './sdk';
import * as AuthZ from '../v1/authz';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});
afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

describe('Integration Permission', () => {
  test('Integrations have permissions to connector:execute', async () => {}, 180000);
});
