import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { request } from '@5qtrs/request';

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

describe('health', () => {
  test('is healthy', async () => {
    let response = await request(`${account.baseUrl}/v1/health`);
    expect(response.status).toEqual(200);
  });
});
