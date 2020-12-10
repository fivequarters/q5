import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { deleteFunction, putFunction, deleteAllFunctions } from './sdk';
import { IHttpResponse } from '@5qtrs/request';

import './extendJest';

const newBoundaryId = (): string => {
  return `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
};

const setupEnvironment = () => {
  let account: IAccount = FakeAccount;
  let accountToken: string;

  let boundaryId = newBoundaryId();
  const function1Id = 'test-function-1';
  const function2Id = 'test-function-2';
  const function3Id = 'test-function-3';
  const function4Id = 'test-function-4';
  const function5Id = 'test-function-5';

  beforeAll(async () => {
    account = await resolveAccount();
    accountToken = account.accessToken;
  });

  afterAll(async () => {
    account.accessToken = accountToken;
    await deleteAllFunctions(account, boundaryId);
  }, 200000);

  beforeEach(async () => {
    account.accessToken = accountToken;
    await deleteAllFunctions(account, boundaryId);
  }, 200000);

  const rotateBoundary = (): string => {
    boundaryId = newBoundaryId();
    return boundaryId;
  };

  const getBoundary = (): string => {
    return boundaryId;
  };

  const getAccount = (): IAccount => {
    return account;
  };

  return {
    getAccount,
    getBoundary,
    rotateBoundary,
    function1Id,
    function2Id,
    function3Id,
    function4Id,
    function5Id,
  };
};

export { setupEnvironment };
