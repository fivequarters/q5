import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { getMe, deleteAllFunctions, deleteFunction, getFunction, getFunctionLocation, putFunction } from './sdk';

let account: IAccount = FakeAccount;
const { getAccount } = setupEnvironment();
const boundaryId = `test-bnd-runas-${random({ lengthInBytes: 8 })}`;
const function1Id = 'test-fun-runas-1';

// Convert '/run' to '/exec/acc-1234'.
const tweakUrl = (url: string) => url.replace('run', `exec/${account.accountId}`);

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };',
    },
  },
};

const helloWorldRunas = {
  permissions: ['function:*:/'],
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };',
    },
  },
};

describe('runas', () => {
  test('normal function has no permissions added', async () => {
    account = getAccount();
    const create = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(create.status).toEqual(200);
    let url: string;
    let response;

    url = create.data.location;

    // Check the run variant
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).toBeUndefined();

    // Check the exec variant
    url = tweakUrl(url);
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).toBeUndefined();
  }, 180000);

  test.only('jwt created with permissions', async () => {
    account = getAccount();
    const create = await putFunction(account, boundaryId, function1Id, helloWorldRunas);
    httpExpect(create, { statusCode: 200 });
    let url: string;
    let response;

    url = create.data.location;

    // Check the run variant
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).toBeUndefined();

    // Check the exec variant
    url = tweakUrl(url);
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).not.toBeUndefined();
    console.log(
      `curl ${account.baseUrl}/v1/account/${account.accountId}/me -H 'Authorization: Bearer ${response.data.headers.authorization}'\n` +
        `jwtd ${response.data.headers.authorization}`
    );
    const r = (await getMe(account)).data.id === (await getMe(account, response.data.headers.authorization)).data.id;
  }, 180000);
});
