import { IAccount } from './accountResolver';

import { Permissions } from '@5qtrs/constants';

import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

export const reqAllWild = { action: '*', resource: '/' };
export const reqFunctionWild = { action: Permissions.allFunction, resource: '/' };
export const reqFunctionGet = { action: Permissions.getFunction, resource: '/' };
export const reqFunctionPut = { action: Permissions.putFunction, resource: '/' };
export const reqFunctionExe = { action: Permissions.exeFunction, resource: '/' };

export const permAllWild = { allow: [reqAllWild] };
export const permFunctionWild = { allow: [reqFunctionWild] };
export const permFunctionGet = { allow: [reqFunctionGet] };
export const permFunctionPut = { allow: [reqFunctionPut] };
export const permFunctionPutExe = { allow: [reqFunctionPut, reqFunctionExe] };
export const permFunctionExe = { allow: [reqFunctionExe] };
export const permFunctionGetExe = { allow: [reqFunctionGet, reqFunctionExe] };

export const permFunctionPutLimited = (perm: string, acc: IAccount, boundaryId: string) => ({
  allow: [
    { action: perm, resource: `/account/${acc.accountId}/subscription/${acc.subscriptionId}/boundary/${boundaryId}/` },
  ],
});

export const permFunctionPutLimitedHigher = (perm: string, acc: IAccount) => ({
  allow: [{ action: perm, resource: `/account/${acc.accountId}/` }],
});

export const getTokenByPerm = async (perm: any) => {
  const profile = await FusebitProfile.create();
  const executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, perm);
  return executionProfile.accessToken;
};
