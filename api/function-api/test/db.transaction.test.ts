import * as Db from '@5qtrs/db';
import { random } from '@5qtrs/random';
import * as AWS from 'aws-sdk';

const accountId = `acc-0000000000000000`;

describe('DB transaction', () => {
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

  test('Commit works', async () => {
    const sqlOptions = {
      transactionId: await Db.createTransaction(),
    };
    const keys = {
      accountId,
      subscriptionId,
      id: 'storage-1',
    };
    const storage = {
      ...keys,
      data: { foo: 'bar' },
      tags: {},
    };
    const result1 = await Db.putStorage(storage, sqlOptions);
    expect(result1).toMatchObject(storage);
    await expect(Db.getStorage(keys)).rejects.toThrowError(Db.NotFoundError);
    await Db.commitTransaction(sqlOptions.transactionId);
    const result3 = await Db.getStorage(keys);
    expect(result3).toMatchObject(storage);
  }, 10000);

  test('Rollback works', async () => {
    const sqlOptions = {
      transactionId: await Db.createTransaction(),
    };
    const keys = {
      accountId,
      subscriptionId,
      id: 'storage-1',
    };
    const storage = {
      ...keys,
      data: { foo: 'bar' },
      tags: {},
    };
    const result1 = await Db.putStorage(storage, sqlOptions);
    expect(result1).toMatchObject(storage);
    await expect(Db.getStorage(keys)).rejects.toThrowError(Db.NotFoundError);
    await Db.rollbackTransaction(sqlOptions.transactionId);
    await expect(Db.getStorage(keys)).rejects.toThrowError(Db.NotFoundError);
  }, 10000);
});
