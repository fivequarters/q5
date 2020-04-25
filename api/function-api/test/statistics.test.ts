import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { getStatistics, statisticsEnabled } from './sdk';
import { request } from '@5qtrs/request';
import { setupEnvironment, httpExpect } from './common';

const { getAccount, rotateBoundary, createFunction, function1Id, function2Id } = setupEnvironment();

const createAndHitFunction = async (
  account: IAccount,
  boundaryId: string,
  func: string,
  expectedCode: number,
  expectedSource: any = {}
) => {
  // Create a target function
  let response = await createFunction(function1Id, func);

  // Hit the endpoint once.
  response = await request(response.data.location);
  httpExpect(response, { status: expectedCode, headers: { 'x-fx-response-source': expectedSource } });

  // Get the bulk data from the endpoint.
  response = await getStatistics(
    account,
    'itemizedbulk',
    {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
    },
    response => response.data.total != 0,
    { statusCode: expectedCode }
  );
  httpExpect(response, { status: 200, data: { total: 1, next: 1 } });

  return response;
};

const validateEntry = (account: IAccount, entry: any, boundaryId: string, functionId: string) => {
  // Validate: response.fusebit object contains expected results for filtering purposes
  expect(entry.fusebit.accountId).toEqual(account.accountId);
  expect(entry.fusebit.subscriptionId).toEqual(account.subscriptionId);
  expect(entry.fusebit.boundaryId).toEqual(boundaryId);
  expect(entry.fusebit.functionId).toEqual(function1Id);
  expect(entry.fusebit).toHaveProperty('deploymentKey');
  expect(entry.fusebit.deploymentKey.length).toBeGreaterThan(0);
  expect(entry.fusebit.mode).toEqual('request');
  expect(entry.fusebit.modality).toEqual('execution');
};

describe('statistics', () => {
  test('itemized bulk contains a function event at various scopes', async () => {
    const account = getAccount();
    let boundaryId = rotateBoundary();
    if (!(await statisticsEnabled(account))) return;

    // Create and hit target function
    let response = await createAndHitFunction(
      account,
      boundaryId,
      'module.exports = async (ctx) => { return { body: "hello" }; };',
      200,
      'function'
    );

    // Validate: one response back from the statistics endpoint for this boundary
    expect(response.data.items.length).toEqual(1);

    let entry = response.data.items[0];

    // Validate: response.fusebit object contains expected results for filtering purposes
    validateEntry(account, entry, boundaryId, function1Id);

    // Validate: increasing breadth of query by reducing IDs still includes target function UUID event
    response = await getStatistics(
      account,
      'itemizedbulk',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        // Search w/o the boundaryId,
      },
      response => response.data.total != 0,
      { statusCode: 200 }
    );
    httpExpect(response, { status: 200 });
    expect(response.data.items.some((e: any) => e.requestId === entry.requestId)).toBe(true);

    response = await getStatistics(
      account,
      'itemizedbulk',
      {
        accountId: account.accountId,
        // Search w/o the subscriptionId
        // Search w/o the boundaryId
      },
      response => response.data.total != 0,
      { statusCode: 200 }
    );
    httpExpect(response, { status: 200 });
    expect(response.data.items.some((e: any) => e.requestId === entry.requestId)).toBe(true);
  }, 30000);

  test('failing exception logged as 500', async () => {
    const account = getAccount();
    let boundaryId = rotateBoundary();
    if (!(await statisticsEnabled(account))) return;

    // Create and hit target function
    let response = await createAndHitFunction(
      account,
      boundaryId,
      'module.exports = async (ctx) => { throw new Error("FOOBAR"); };',
      500,
      'provider' // It's an open question whether this should be function or provider
    );
    expect(response.data.items.length).toEqual(1);
    let entry = response.data.items[0];

    // Validate that the object that's been returned contains useful and interesting details.
    validateEntry(account, entry, boundaryId, function1Id);
    expect(entry.response.statusCode).toEqual(500);
    expect(entry.error).not.toBeNull();
    expect(entry.error.errorType).toEqual('Error');
    expect(entry.error.errorMessage).toEqual('FOOBAR');
    expect(entry.error.stack).toHaveProperty('0');
    expect(entry.error.stack).toHaveProperty('1');
    expect(entry.error.stack).toHaveProperty('2');
  }, 30000);

  test('code activity histogram contains a function event at various scopes', async () => {
    const account = getAccount();
    let boundaryId = rotateBoundary();
    if (!(await statisticsEnabled(account))) return;

    // Create and hit target function
    let response = await createAndHitFunction(
      account,
      boundaryId,
      'module.exports = async (ctx) => { return { body: "hello" }; };',
      200,
      'function'
    );
    // Validate: one response back from the statistics endpoint for this boundary
    expect(response.data.items.length).toEqual(1);
    let entry = response.data.items[0];
    validateEntry(account, entry, boundaryId, function1Id);

    // Validate: increasing breadth of query by reducing IDs still includes target function UUID event
    response = await getStatistics(
      account,
      'codeactivityhg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      response => response.data.items.length != 0,
      { statusCode: 200 }
    );
    httpExpect(response, { status: 200 });
    expect(response.data.items.length).toEqual(1);
    expect(response.data.items[0]).toHaveProperty('200', 1);
    expect(response.data.items[0]).toHaveProperty('key');

    response = await getStatistics(
      account,
      'codeactivityhg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        // Search w/o the boundaryId,
      },
      response => response.data.items.length != 0,
      { statusCode: 200 }
    );
    httpExpect(response, { status: 200 });
    expect(response.data.items.length).toBeGreaterThanOrEqual(1);

    response = await getStatistics(
      account,
      'itemizedbulk',
      {
        accountId: account.accountId,
        // Search w/o the subscriptionId
        // Search w/o the boundaryId
      },
      response => response.data.total != 0,
      { statusCode: 200 }
    );
    httpExpect(response, { status: 200 });
    expect(response.data.items.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  test.todo('cron function invocation event');
});
