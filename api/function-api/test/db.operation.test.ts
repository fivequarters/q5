import * as Db from '@5qtrs/db';
import { random } from '@5qtrs/random';
import * as AWS from 'aws-sdk';

const accountId = `acc-0000000000000000`;

describe('DB operation', () => {
  let rds: AWS.RDSDataService;
  let credentials: Db.IRdsCredentials;
  let subscriptionId: string;

  beforeAll(async () => {
    [rds, credentials] = await Db.ensureRds();
    subscriptionId = `sub-${random({ lengthInBytes: 16 })}`;
  });

  afterEach(async () => {
    await rds
      .executeStatement({
        ...credentials,
        sql: `delete from entity where accountId = '${accountId}' and subscriptionId = '${subscriptionId}';`,
      })
      .promise();
  }, 5000);

  test('Create works', async () => {
    const op = {
      accountId,
      subscriptionId,
      id: 'opn-1',
      data: { foo: 'bar' },
    };
    const result = await Db.putOperation(op);
    expect(result).toBeDefined();
    expect(result).toMatchObject(op);
    expect(result.expires).toBeDefined();
  }, 10000);

  test('Create then get works', async () => {
    const keys = {
      accountId,
      subscriptionId,
      id: 'opn-1',
    };
    const op = {
      ...keys,
      data: { foo: 'bar' },
    };
    const result = await Db.putOperation(op);
    expect(result).toBeDefined();
    expect(result).toMatchObject(op);
    expect(result.expires).toBeDefined();
    const result1 = (await Db.getOperation(keys)) as Db.IOperation;
    expect(result1).toBeDefined();
    expect(result1).toMatchObject(op);
    expect(result1.expires).toBeDefined();
    expect(result1.expires).toBe(result.expires);
  }, 10000);

  test('Expiry works', async () => {
    const key = {
      accountId,
      subscriptionId,
      id: 'opn-1',
    };
    const op = {
      ...key,
      data: { foo: 'bar' },
      expires: Date.now() + 50,
    };
    const result = await Db.putOperation(op);
    expect(result).toMatchObject(op);
    await new Promise((r) => setTimeout(() => r(undefined), 100));
    const result1 = await Db.getOperation(key);
    expect(result1).toBeUndefined();
  }, 10000);

  test('Upsert works', async () => {
    const op = {
      accountId,
      subscriptionId,
      id: 'opn-1',
      data: { foo: 'bar' },
    };
    const result = await Db.putOperation(op);
    expect(result).toMatchObject(op);
    const op1 = { ...op, data: { foo: 'baz' } };
    const result1 = await Db.putOperation(op1);
    expect(result1).toMatchObject(op1);
    expect(result1.expires).toBeGreaterThan(result.expires || 0);
  }, 10000);
});
