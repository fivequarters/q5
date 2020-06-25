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
  httpExpect(response, { statusCode: expectedCode, headers: { 'x-fx-response-source': expectedSource } });

  // Get the bulk data from the endpoint.
  response = await getStatistics(
    account,
    'itemizedbulk',
    {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
    },
    (response) => response.data.total != 0,
    { code: expectedCode }
  );
  httpExpect(response, { statusCode: 200, data: { total: 1, next: 1 } });

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

  // If you're missing these, add this to your .env.template:
  //   API_STACK_VERSION=dev
  //   API_STACK_ID=0
  //   API_STACK_AMI=0
  expect(entry.fusebit.stackVersion).toEqual('dev');
  expect(entry.fusebit.stackId).toEqual('0');
  expect(entry.fusebit.stackAMI).toEqual('0');
};

describe('statistics', () => {
  test('itemized bulk contains a function event at various scopes', async () => {
    const account = getAccount();
    let boundaryId = rotateBoundary();
    if (!(await statisticsEnabled(account))) return;

    // Add a response to make sure only the requested data is returned
    let responseAlt = await createAndHitFunction(
      account,
      boundaryId,
      'module.exports = async (ctx) => { return { status: 304, body: "hello" }; };',
      304,
      'function'
    );

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
      (response) => response.data.total != 0,
      { code: 200 }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.some((e: any) => e.requestId === entry.requestId)).toBe(true);

    response = await getStatistics(
      account,
      'itemizedbulk',
      {
        accountId: account.accountId,
        // Search w/o the subscriptionId
        // Search w/o the boundaryId
      },
      (response) => response.data.total != 0,
      { code: 200 }
    );
    httpExpect(response, { statusCode: 200 });
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

    // Add a response to make sure only the requested data is returned
    let responseAlt = await createAndHitFunction(
      account,
      boundaryId,
      'module.exports = async (ctx) => { return { status: 304, body: "hello" }; };',
      304,
      'function'
    );

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
      (response) => response.data.items.length != 0,
      { code: 200 }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toEqual(1);
    expect(response.data.items[0]).toHaveProperty('200', 1);
    expect(response.data.items[0]).toHaveProperty('key');
    expect(response.data.items[0]).not.toHaveProperty('304');

    response = await getStatistics(
      account,
      'codeactivityhg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        // Search w/o the boundaryId,
      },
      (response) => response.data.items.length != 0,
      { code: 200 }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toBeGreaterThanOrEqual(1);

    response = await getStatistics(
      account,
      'itemizedbulk',
      {
        accountId: account.accountId,
        // Search w/o the subscriptionId
        // Search w/o the boundaryId
      },
      (response) => response.data.total != 0,
      { code: 200 }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  test('field unique histogram contains a function event at various scopes', async () => {
    const account = getAccount();
    let boundaryId = rotateBoundary();
    if (!(await statisticsEnabled(account))) return;

    // Add a response to make sure only the requested data is returned
    let responseAlt = await createAndHitFunction(
      account,
      boundaryId,
      'module.exports = async (ctx) => { return { status: 304, body: "hello" }; };',
      304,
      'function'
    );

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

    // Validate: value of 1 is present for a 200 success
    response = await getStatistics(
      account,
      'fielduniquehg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => response.data.items.length != 0,
      { field: 'accountid', code: 200 }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toEqual(1);
    expect(response.data.items[0]).toHaveProperty('200', 1);
    expect(response.data.items[0]).toHaveProperty('key');
    expect(response.data.items[0]).not.toHaveProperty('304');

    // Validate: no hits found for a code of 300
    response = await getStatistics(
      account,
      'fielduniquehg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => response.data.items.length == 0,
      { field: 'accountid', code: 300 }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toEqual(0);

    // Validate: Missing a 'field' returns a 400 error.
    response = await getStatistics(
      account,
      'fielduniquehg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => true,
      { codeGrouped: true }
    );
    httpExpect(response, { statusCode: 400 });

    // Validate: Supplying an incorrect field returns a 400
    response = await getStatistics(
      account,
      'fielduniquehg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => true,
      { field: 'foobar', codeGrouped: null }
    );
    httpExpect(response, { statusCode: 400 });
  }, 30000);

  test('validate codeGrouped works', async () => {
    const account = getAccount();
    let boundaryId = rotateBoundary();
    if (!(await statisticsEnabled(account))) return;

    // Add a response to make sure only the requested data is returned
    let responseAlt = await createAndHitFunction(
      account,
      boundaryId,
      'module.exports = async (ctx) => { return { status: 304, body: "hello" }; };',
      304,
      'function'
    );

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

    // Validate: itemized bulk against 2xx returns the event
    response = await getStatistics(
      account,
      'itemizedbulk',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => response.data.total != 0,
      { code: '2xx' }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toEqual(1);
    expect(response.data.items.some((e: any) => e.requestId === entry.requestId)).toBe(true);

    // Validate: itemized bulk against 3xx does not return the event
    response = await getStatistics(
      account,
      'itemizedbulk',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => response.data.total == 1,
      { code: '3xx' }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toEqual(1);

    // Validate: grouped histogram queries return the event in the valid cateogry.
    response = await getStatistics(
      account,
      'fielduniquehg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => response.data.total != 0,
      { field: 'boundaryid', codeGrouped: true }
    );
    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toEqual(1);
    expect(response.data.items[0]).toHaveProperty('2xx', 1);
    expect(response.data.items[0]).toHaveProperty('3xx', 1);
    expect(response.data.items[0]).not.toHaveProperty('4xx');
    expect(response.data.items[0]).not.toHaveProperty('5xx');
    expect(response.data.items[0]).toHaveProperty('key');

    // Validate: 'false' works to disable codeGroup
    response = await getStatistics(
      account,
      'fielduniquehg',
      {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId: boundaryId,
      },
      (response) => response.data.total != 0,
      { field: 'boundaryid', codeGrouped: false }
    );

    httpExpect(response, { statusCode: 200 });
    expect(response.data.items.length).toEqual(1);
    expect(response.data.items[0]).toHaveProperty('200', 1);
    expect(response.data.items[0]).toHaveProperty('304', 1);
    expect(response.data.items[0]).toHaveProperty('key');
  }, 30000);
  test.todo('cron function invocation event');
});
