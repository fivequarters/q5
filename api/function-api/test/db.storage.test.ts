import * as Db from '@5qtrs/db';
import * as Entity from './db.entity';
import { random } from '@5qtrs/random';
import * as AWS from 'aws-sdk';

const accountId = `acc-0000000000000000`;

describe('DB storage', () => {
  Entity.createEntityTests({
    get: Db.getStorage as Entity.GetFunc,
    create: Db.putStorage as Entity.CreateFunc,
    update: Db.putStorage as Entity.UpdateFunc,
    delete: (params: Db.IEntityKey, options?: Db.IStatementOptions) => Db.deleteStorage(params, false, options), // non-recursive
    list: Db.listStorage as Entity.ListFunc,
    getTags: Db.getStorageTags as Entity.GetTagsFunc,
    setTags: Db.setStorageTags as Entity.SetTagsFunc,
    setTag: Db.setStorageTag as Entity.SetTagFunc,
    deleteTag: Db.deleteStorageTag as Entity.DeleteTagFunc,
    upsertSemantics: true,
  });

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

  test('Listing recursively works', async () => {
    const records = ['/foo/bar/', '/baz/foo/', '/foobar/baz', '/foo/baz/'];
    await Promise.all(
      records.map((id) =>
        Db.putStorage({
          accountId,
          subscriptionId,
          id,
          data: { id },
          tags: {},
        })
      )
    );
    let result = await Db.listStorage({
      accountId,
      subscriptionId,
      idPrefix: '/foo/',
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items[0].id).toBe('/foo/bar/');
    expect(result.items[1].id).toBe('/foo/baz/');
    expect(result.next).toBeUndefined();
  }, 10000);

  test('Deleting recursively works', async () => {
    const records = ['/foo/bar/', '/baz/foo/', '/foobar/baz', '/foo/baz/'];
    await Promise.all(
      records.map((id) =>
        Db.putStorage({
          accountId,
          subscriptionId,
          id,
          data: { id },
          tags: {},
        })
      )
    );
    let deleteResult = await Db.deleteStorage(
      {
        accountId,
        subscriptionId,
        id: '/foo/',
      },
      true
    );
    expect(deleteResult).toBe(true);
    let result = await Db.listStorage({
      accountId,
      subscriptionId,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.items[0].id).toBe('/baz/foo/');
    expect(result.items[1].id).toBe('/foobar/baz');
    expect(result.next).toBeUndefined();
  }, 10000);

  test('Listing excludes expired items', async () => {
    const records = [Date.now() - 1000, Date.now() + 60000];
    await Promise.all(
      records.map((expires, i) =>
        Db.putStorage({
          accountId,
          subscriptionId,
          id: i.toString(),
          data: { i },
          tags: {},
          expires,
        })
      )
    );
    let result = await Db.listStorage({
      accountId,
      subscriptionId,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('1');
    expect(result.next).toBeUndefined();
  }, 10000);
});
