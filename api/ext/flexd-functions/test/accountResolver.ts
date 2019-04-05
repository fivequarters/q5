export interface IAccount {
  accountId: string;
  subscriptionId: string;
  baseUrl: string;
  accessToken: string;
}

export const FakeAccount: IAccount = {
  accountId: 'NA',
  subscriptionId: 'NA',
  baseUrl: 'NA',
  accessToken: 'NA',
};

export async function resolveAccount(): Promise<IAccount> {
  return {
    accountId: 'acc-0000000000000000',
    subscriptionId: 'sub-0000000000000000',
    baseUrl: process.env.API_SERVER || 'http://localhost:3001',
    accessToken: process.env.API_AUTHORIZATION_KEY || 'NA',
  };
}
