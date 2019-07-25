import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

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

export function cloneWithAccessToken(account: IAccount, accessToken: string) {
  return {
    accountId: account.accountId,
    subscriptionId: account.subscriptionId,
    baseUrl: account.baseUrl,
    accessToken,
  };
}

export async function getMalformedAccount(): Promise<IAccount> {
  const account = await resolveAccount();
  return {
    accountId: 'acc-1234',
    subscriptionId: account.subscriptionId,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
  };
}

export async function getNonExistingAccount(): Promise<IAccount> {
  const account = await resolveAccount();
  return {
    accountId: 'acc-9999999999999999',
    subscriptionId: account.subscriptionId,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
  };
}

export async function resolveAccount(): Promise<IAccount> {
  if (process.env.API_SERVER && process.env.API_AUTHORIZATION_KEY) {
    return {
      accountId: 'acc-b503fb00e15248c6',
      subscriptionId: 'sub-0000000000000000',
      baseUrl: process.env.API_SERVER,
      accessToken: process.env.API_AUTHORIZATION_KEY,
    };
  } else if (process.env.FUSE_PROFILE) {
    let profile = await FusebitProfile.create();
    let executionProfile = await profile.getExecutionProfile(process.env.FUSE_PROFILE, true);
    return {
      accountId: executionProfile.account as string,
      subscriptionId: executionProfile.subscription as string,
      baseUrl: executionProfile.baseUrl,
      accessToken: executionProfile.accessToken,
    };
  } else {
    let error =
      'ERROR: You must provide FUSE_PROFILE environment variable or API_SERVER and API_AUTHORIZATION_KEY variables to choose a deployment to run tests against.';
    console.log(error);
    throw new Error(error);
  }
}
