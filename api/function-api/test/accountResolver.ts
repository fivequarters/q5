import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

export interface IAccount {
  accountId: string;
  subscriptionId: string;
  audience: string;
  baseUrl: string;
  accessToken: string;
  userAgent: string;
}

export const FakeAccount: IAccount = {
  accountId: 'NA',
  subscriptionId: 'NA',
  audience: 'NA',
  baseUrl: 'NA',
  accessToken: 'NA',
  userAgent: 'NA',
};

export function cloneWithAccessToken(account: IAccount, accessToken: string) {
  return {
    accountId: account.accountId,
    subscriptionId: account.subscriptionId,
    audience: account.audience,
    baseUrl: account.baseUrl,
    accessToken,
    userAgent: account.userAgent,
  };
}

export function cloneWithUserAgent(account: IAccount, userAgent: string) {
  return {
    accountId: account.accountId,
    subscriptionId: account.subscriptionId,
    audience: account.audience,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
    userAgent,
  };
}

export async function getMalformedAccount(): Promise<IAccount> {
  const account = await resolveAccount();
  return {
    accountId: 'acc-1234',
    subscriptionId: account.subscriptionId,
    audience: account.audience,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
    userAgent: 'fusebit-test',
  };
}

export async function getNonExistingAccount(): Promise<IAccount> {
  const account = await resolveAccount();
  return {
    accountId: 'acc-9999999999999999',
    subscriptionId: account.subscriptionId,
    audience: account.audience,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
    userAgent: 'fusebit-test',
  };
}

export async function resolveAccount(): Promise<IAccount> {
  if (process.env.FUSE_PROFILE) {
    let profile = await FusebitProfile.create();
    let executionProfile = await profile.getExecutionProfile(process.env.FUSE_PROFILE, true);
    return {
      accountId: executionProfile.account as string,
      subscriptionId: executionProfile.subscription as string,
      audience: executionProfile.baseUrl,
      baseUrl: process.env.BASE_URL || executionProfile.baseUrl,
      accessToken: executionProfile.accessToken,
      userAgent: 'fusebit-test',
    };
  } else {
    let error =
      'ERROR: You must provide FUSE_PROFILE environment variable to choose a deployment to run tests against.';
    console.log(error);
    throw new Error(error);
  }
}
