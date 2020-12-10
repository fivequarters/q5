import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { request } from '@5qtrs/request';

import './extendJest';

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

describe('health', () => {
  test('is healthy', async () => {
    const response = await request(`${account.baseUrl}/v1/health`);
    expect(response).toBeHttp({ statusCode: 200 });
  });
});
