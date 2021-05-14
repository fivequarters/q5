import { request } from '@5qtrs/request';

import { postSession, getSession, putSession } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Sessions', () => {
  test('Test Simple Sessions', async () => {
    const integId = boundaryId; // Guaranteed not to conflict
    let response = await postSession(account, 'integration', integId, { foo: 1 });
    expect(response).toBeHttp({ statusCode: 200, has: ['session'] });
    const sessionId = response.data.session;
    response = await getSession(account, 'integration', integId, sessionId);
    expect(response).toBeHttp({ statusCode: 200, data: { foo: 1 } });
    response = await putSession(account, 'integration', integId, sessionId, { foo: 9 });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await getSession(account, 'integration', integId, sessionId);
    expect(response).toBeHttp({ statusCode: 200, data: { foo: 9 } });
  });
});
