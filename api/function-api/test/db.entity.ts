import { random } from '@5qtrs/random';
import * as AWS from 'aws-sdk';
import * as Db from '@5qtrs/db';

const accountId = `acc-0000000000000000`;

interface CreateFunc {
  (params: Db.IIntegrationCreateRequest, options?: Db.IStatementOptions): Promise<Db.IEntity>;
}

interface GetFunc {
  (params: Db.IEntityKey): Promise<Db.IEntity>;
}

interface DeleteFunc {
  (params: Db.IEntityKey, options?: Db.IStatementOptions): Promise<boolean>;
}

interface UpdateFunc {
  (params: Db.IEntity, options?: Db.IStatementOptions): Promise<Db.IEntity | undefined>;
}

interface ListFunc {
  (params: Db.IListRequest): Promise<Db.IListResponse>;
}

interface GetTagsFunc {
  (params: Db.IEntityKey): Promise<Db.ITagsWithVersion | undefined>;
}

interface SetTagsFunc {
  (params: Db.IEntityKey, tags: Db.ITagsWithVersion, options?: Db.IStatementOptions): Promise<
    Db.ITagsWithVersion | undefined
  >;
}

interface SetTagFunc {
  (params: Db.IEntityKey, key: string, value: string, version?: number, options?: Db.IStatementOptions): Promise<
    Db.ITagsWithVersion | undefined
  >;
}

interface DeleteTagFunc {
  (params: Db.IEntityKey, key: string, version?: number, options?: Db.IStatementOptions): Promise<
    Db.ITagsWithVersion | undefined
  >;
}

interface IEntityDelegates {
  get: GetFunc;
  create: CreateFunc;
  delete: DeleteFunc;
  update: UpdateFunc;
  list: ListFunc;
  getTags: GetTagsFunc;
  setTags: SetTagsFunc;
  setTag: SetTagFunc;
  deleteTag: DeleteTagFunc;
  upsertSemantics?: boolean;
}

const createEntityTests = (delegates: IEntityDelegates) => {
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

  test('Create then get works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags: {},
    });
    const result = (await delegates.get({
      accountId,
      subscriptionId,
      id,
    })) as Db.IEntity;
    expect(result).toBeDefined();
    expect(result.data).toMatchObject(data);
    expect(result.tags).toMatchObject({});
    expect(result.accountId).toBe(accountId);
    expect(result.subscriptionId).toBe(subscriptionId);
    expect(result.id).toBe(id);
    expect(result.version).toBe(1);
    expect(Object.keys(result).length).toBe(6);
  }, 10000);

  test('Get returns undefined if not found', async () => {
    const id = 'slack';
    const result = await delegates.get({
      accountId,
      subscriptionId,
      id,
    });
    expect(result).toBeUndefined();
  }, 10000);

  test('Deleting non-existing works', async () => {
    const id = 'slack';
    const result = await delegates.delete({
      accountId,
      subscriptionId,
      id,
    });
    expect(result).toBe(false);
  }, 10000);

  test('Deleting existing works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags: {},
    });
    const result = await delegates.delete({
      accountId,
      subscriptionId,
      id,
    });
    expect(result).toBe(true);
  }, 10000);

  test('Updating existing works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const newData = { foo: 'baz' };
    let result = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags: {},
    });
    result.data = newData;
    result = (await delegates.update(result)) as Db.IEntity;
    expect(result).toBeDefined();
    expect(result.data).toMatchObject(newData);
    expect(result.tags).toMatchObject({});
    expect(result.accountId).toBe(accountId);
    expect(result.subscriptionId).toBe(subscriptionId);
    expect(result.id).toBe(id);
    expect(result.version).toBe(2);
    expect(Object.keys(result).length).toBe(6);
  }, 10000);

  !delegates.upsertSemantics &&
    test('Updating non-existing returns undefined', async () => {
      const id = 'slack';
      const data = { foo: 'bar' };
      let result = await delegates.update({
        accountId,
        subscriptionId,
        id,
        data,
        tags: {},
      });
      expect(result).toBeUndefined();
    }, 10000);

  test('Updating conflicting returns undefined', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    let result = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags: {},
    });
    await delegates.update(result); // "concurrent" update
    result = (await delegates.update(result)) as Db.IEntity;
    expect(result).toBeUndefined();
  }, 10000);

  test('Listing works', async () => {
    const records = [1, 2, 3];
    await Promise.all(
      records.map((n) =>
        delegates.create({
          accountId,
          subscriptionId,
          id: `slack-${n}`,
          data: { foo: n },
          tags: {},
        })
      )
    );
    let result = await delegates.list({
      accountId,
      subscriptionId,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(3);
    expect(result.next).toBeUndefined();
    records.forEach((r, i) =>
      expect(result.items[i]).toMatchObject({
        accountId,
        subscriptionId,
        id: `slack-${r}`,
        version: 1,
        tags: {},
      })
    );
  }, 10000);

  test('Listing by one tag works', async () => {
    const records = [1, 2, 3];
    await Promise.all(
      records.map((n) =>
        delegates.create({
          accountId,
          subscriptionId,
          id: `slack-${n}`,
          data: { foo: n },
          tags: { serviceLevel: n == 2 ? 'gold' : 'silver', foo: 'bar' },
        })
      )
    );
    let result = await delegates.list({
      accountId,
      subscriptionId,
      tags: { serviceLevel: 'silver' },
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeUndefined();
    expect(result.items[0]).toMatchObject({
      accountId,
      subscriptionId,
      id: `slack-1`,
      version: 1,
      tags: { serviceLevel: 'silver', foo: 'bar' },
    });
    expect(result.items[1]).toMatchObject({
      accountId,
      subscriptionId,
      id: `slack-3`,
      version: 1,
      tags: { serviceLevel: 'silver', foo: 'bar' },
    });
  }, 10000);

  test('Listing by two tags works', async () => {
    const records = [1, 2, 3];
    await Promise.all(
      records.map((n) =>
        delegates.create({
          accountId,
          subscriptionId,
          id: `slack-${n}`,
          data: { foo: n },
          tags: { serviceLevel: n == 2 ? 'gold' : 'silver', billing: n === 1 ? 'annual' : 'monthly' },
        })
      )
    );
    let result = await delegates.list({
      accountId,
      subscriptionId,
      tags: { serviceLevel: 'silver', billing: 'monthly' },
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.next).toBeUndefined();
    expect(result.items[0]).toMatchObject({
      accountId,
      subscriptionId,
      id: `slack-3`,
      version: 1,
      tags: { serviceLevel: 'silver', billing: 'monthly' },
    });
  }, 10000);

  test('Listing by id prefix works', async () => {
    const records = ['/foo/bar/', '/foobar/baz/', '/foo/baz/', '/baz/foo/'];
    await Promise.all(
      records.map((id) =>
        delegates.create({
          accountId,
          subscriptionId,
          id,
          data: { key: id },
          tags: {},
        })
      )
    );
    let result = await delegates.list({
      accountId,
      subscriptionId,
      idPrefix: '/foo/',
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeUndefined();
    expect(result.items[0]).toMatchObject({
      accountId,
      subscriptionId,
      id: '/foo/bar/',
      version: 1,
      tags: {},
    });
    expect(result.items[1]).toMatchObject({
      accountId,
      subscriptionId,
      id: '/foo/baz/',
      version: 1,
      tags: {},
    });
  }, 10000);

  test('Listing with paging works (variant 1)', async () => {
    const records = [1, 2, 3, 4];
    await Promise.all(
      records.map((n) =>
        delegates.create({
          accountId,
          subscriptionId,
          id: `${n}`,
          data: { foo: n },
          tags: {},
        })
      )
    );
    let result = await delegates.list({
      accountId,
      subscriptionId,
      limit: 2,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeDefined();
    expect(result.items[0].id).toBe(`1`);
    expect(result.items[1].id).toBe(`2`);
    result = await delegates.list({
      accountId,
      subscriptionId,
      limit: 2,
      next: result.next,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeUndefined();
    expect(result.items[0].id).toBe(`3`);
    expect(result.items[1].id).toBe(`4`);
  }, 10000);

  test('Listing with paging works (variant 2)', async () => {
    const records = [1, 2, 3];
    await Promise.all(
      records.map((n) =>
        delegates.create({
          accountId,
          subscriptionId,
          id: `${n}`,
          data: { foo: n },
          tags: {},
        })
      )
    );
    let result = await delegates.list({
      accountId,
      subscriptionId,
      limit: 2,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeDefined();
    expect(result.items[0].id).toBe(`1`);
    expect(result.items[1].id).toBe(`2`);
    result = await delegates.list({
      accountId,
      subscriptionId,
      limit: 2,
      next: result.next,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.next).toBeUndefined();
    expect(result.items[0].id).toBe(`3`);
  }, 10000);

  test('Get tags works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.getTags({
      accountId,
      subscriptionId,
      id,
    })) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(1);
    expect(result.tags).toMatchObject(tags);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Set tags without version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual', tenant: 'contoso' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.setTags(
      {
        accountId,
        subscriptionId,
        id,
      },
      {
        tags: tags1,
      }
    )) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Set tags with version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual', tenant: 'contoso' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.setTags(
      {
        accountId,
        subscriptionId,
        id,
      },
      {
        tags: tags1,
        version: integration.version,
      }
    )) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Set tags with conflicting version returns undefined', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual', tenant: 'contoso' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.setTags(
      {
        accountId,
        subscriptionId,
        id,
      },
      {
        tags: tags1,
        version: 666,
      }
    )) as Db.ITagsWithVersion;
    expect(result).toBeUndefined();
  }, 10000);

  test('Update single tag without version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.setTag(
      {
        accountId,
        subscriptionId,
        id,
      },
      'level',
      tags1.level
    )) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Update single tag with version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.setTag(
      {
        accountId,
        subscriptionId,
        id,
      },
      'level',
      tags1.level,
      integration.version
    )) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Update single tag with conflicting version returns undefined', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.setTag(
      {
        accountId,
        subscriptionId,
        id,
      },
      'level',
      tags1.level,
      666
    )) as Db.ITagsWithVersion;
    expect(result).toBeUndefined();
  }, 10000);

  test('Delete single tag works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.deleteTag(
      {
        accountId,
        subscriptionId,
        id,
      },
      'level'
    )) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject({ billing: 'annual' });
    expect(Object.keys(result.tags).length).toBe(1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Delete single tag with version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.deleteTag(
      {
        accountId,
        subscriptionId,
        id,
      },
      'level',
      integration.version
    )) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject({ billing: 'annual' });
    expect(Object.keys(result.tags).length).toBe(1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Delete single tag with conflicting version returns undefined', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.deleteTag(
      {
        accountId,
        subscriptionId,
        id,
      },
      'level',
      666
    )) as Db.ITagsWithVersion;
    expect(result).toBeUndefined();
  }, 10000);

  test('Delete nonexisting tag works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await delegates.create({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = (await delegates.deleteTag(
      {
        accountId,
        subscriptionId,
        id,
      },
      'nonexisting'
    )) as Db.ITagsWithVersion;
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags);
    expect(Object.keys(result.tags).length).toBe(2);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);
};

export {
  createEntityTests,
  GetFunc,
  CreateFunc,
  ListFunc,
  DeleteFunc,
  UpdateFunc,
  SetTagsFunc,
  GetTagsFunc,
  SetTagFunc,
  DeleteTagFunc,
};
