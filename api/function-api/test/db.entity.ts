import { random } from '@5qtrs/random';
import { Entity, RDS, Model } from '@5qtrs/db';

export interface EntityAssertions<T extends Model.IEntity> {
  create: (arg: {
    accountId: string;
    subscriptionId: string;
    id: string;
    data: object;
    tags?: Model.ITags;
  }) => Model.EntityKeyCreate<T>;
  get: (arg: { accountId: string; subscriptionId: string; id: string }) => Model.EntityKeyGet<T>;
  delete: (arg: { accountId: string; subscriptionId: string; id: string }) => Model.EntityKeyDelete<T>;
  update: (arg: {
    accountId: string;
    subscriptionId: string;
    id: string;
    data: object;
    tags?: Model.ITags;
  }) => Model.EntityKeyUpdate<T>;
  list: (arg: {
    accountId: string;
    subscriptionId: string;
    tags?: Model.ITags;
    idPrefix?: string;
    limit?: number;
    next?: string;
  }) => Model.EntityKeyList<T>;
  tags: {
    set: (arg: {
      accountId: string;
      subscriptionId: string;
      id: string;
      tagKey: string;
      tagValue?: string;
      version?: number;
    }) => Model.EntityKeyTagSet<T>;
    update: (arg: {
      accountId: string;
      subscriptionId: string;
      id: string;
      tags: Model.ITags;
      version?: number;
    }) => Model.EntityKeyTagsUpdate<T>;
    get: (arg: {
      accountId: string;
      subscriptionId: string;
      id: string;
      tags?: Model.ITags;
      version?: number;
    }) => Model.EntityKeyTags<T>;
  };
}

const createEntityTests = <T extends Model.IEntity>(
  entity: Entity<T>,
  entityAssertions: EntityAssertions<T>,
  additionalTests?: (accountId: string, subscriptionId: string) => void
) => {
  const accountId = `acc-0000000000000000`;
  let subscriptionId: string;

  beforeAll(async () => {
    subscriptionId = `sub-${random({ lengthInBytes: 16 })}`;
  });

  afterEach(async () => {
    await RDS.executeStatement(
      `delete from entity where accountId = :accountId and subscriptionId = :subscriptionId;`,
      { accountId, subscriptionId }
    );
  }, 5000);

  test('Create then get works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };

    const createRequest = entityAssertions.create({ accountId, subscriptionId, id, data, tags: {} });
    const response: T = await entity.createEntity(createRequest);
    delete response.expires;
    expect(response).toStrictEqual({
      ...createRequest,
      version: 1,
    });

    const getRequest = entityAssertions.get({ accountId, subscriptionId, id });
    const result = await entity.getEntity(getRequest);
    delete result.expires;
    expect(result).toStrictEqual({
      ...createRequest,
      version: 1,
    });
  }, 10000);

  test('Get throws NotFoundError if not found', async () => {
    const id = 'slack';
    await expect(entity.getEntity(entityAssertions.get({ accountId, subscriptionId, id }))).rejects.toThrowError(
      RDS.NotFoundError
    );
  }, 10000);

  test('Deleting non-existing works', async () => {
    const id = 'slack';
    const result = await entity.deleteEntity(entityAssertions.delete({ accountId, subscriptionId, id }));
    expect(result).toBe(false);
  }, 10000);

  test('Deleting existing works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    await entity.createEntity(entityAssertions.create({ accountId, subscriptionId, id, data, tags: {} }));
    const result = await entity.deleteEntity(entityAssertions.delete({ accountId, subscriptionId, id }));
    expect(result).toBe(true);
  }, 10000);

  test('Updating existing works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const newData = { foo: 'baz' };
    const createRequest = {
      accountId,
      subscriptionId,
      id,
      data,
      tags: {},
    };
    const firstResult = await entity.createEntity(
      entityAssertions.create({ accountId, subscriptionId, id, data, tags: {} })
    );
    const secondResult = await entity.updateEntity(
      entityAssertions.update({ accountId, subscriptionId, id, data: newData, tags: {} })
    );
    delete firstResult.expires;
    delete secondResult.expires;
    expect(secondResult).toStrictEqual({
      ...firstResult,
      data: newData,
      version: 2,
    });
  }, 10000);

  test('Updating non-existing throws NotFoundError', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    await expect(
      entity.updateEntity(entityAssertions.update({ accountId, subscriptionId, id, data, tags: {} }), { upsert: true })
    ).rejects.toThrowError(RDS.NotFoundError);
  }, 10000);

  test('Updating conflicting throws ConflictError', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const result = await entity.createEntity(
      entityAssertions.create({ accountId, subscriptionId, id, data, tags: {} })
    );
    await entity.updateEntity(result); // "concurrent" update
    await expect(entity.updateEntity(result)).rejects.toThrowError(RDS.ConflictError);
  }, 10000);

  test('Listing works', async () => {
    const records = [1, 2, 3];
    const createRequest = (n: number) =>
      entityAssertions.create({
        accountId,
        subscriptionId,
        id: `slack-${n}`,
        data: { foo: n },
        tags: {},
      });

    await Promise.all(records.map((n) => entity.createEntity(createRequest(n))));
    const result = await entity.listEntities(entityAssertions.list({ accountId, subscriptionId }));
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    result.items.forEach((item) => delete item.expires);
    expect(result.items.length).toBe(3);
    expect(result.next).toBeUndefined();
    records.forEach((r, i) =>
      expect(result.items[i]).toStrictEqual({
        ...createRequest(r),
        version: 1,
      })
    );
  }, 10000);

  test('Listing by one tag works', async () => {
    const records = [1, 2, 3];
    const makeRecord: (n: number) => Model.EntityKeyCreate<T> = (n) =>
      entityAssertions.create({
        accountId,
        subscriptionId,
        id: `slack-${n}`,
        data: { foo: n },
        tags: { serviceLevel: n == 2 ? 'gold' : 'silver', foo: 'bar' },
      });
    await Promise.all(records.map((n) => entity.createEntity(makeRecord(n))));
    let result = await entity.listEntities(
      entityAssertions.list({ accountId, subscriptionId, tags: { serviceLevel: 'silver' } })
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeUndefined();
    result.items.forEach((item) => delete item.expires);
    expect(result.items[0]).toStrictEqual({ ...makeRecord(1), version: 1 });
    expect(result.items[1]).toStrictEqual({ ...makeRecord(3), version: 1 });
  }, 10000);

  test('Listing by two tags works', async () => {
    const records = [1, 2, 3];
    const makeRecord: (n: number) => Model.EntityKeyCreate<T> = (n) =>
      entityAssertions.create({
        accountId,
        subscriptionId,
        id: `slack-${n}`,
        data: { foo: n },
        tags: { serviceLevel: n == 2 ? 'gold' : 'silver', billing: n === 1 ? 'annual' : 'monthly' },
      });
    await Promise.all(records.map((n) => entity.createEntity(makeRecord(n))));
    let result = await entity.listEntities(
      entityAssertions.list({
        accountId,
        subscriptionId,
        tags: { serviceLevel: 'silver', billing: 'monthly' },
      })
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.next).toBeUndefined();
    result.items.forEach((item) => delete item.expires);
    expect(result.items[0]).toStrictEqual({ ...makeRecord(3), version: 1 });
  }, 10000);

  test('Listing by id prefix works', async () => {
    const records = ['/foo/bar/', '/foobar/baz/', '/foo/baz/', '/baz/foo/'];
    await Promise.all(
      records.map((id) =>
        entity.createEntity(
          entityAssertions.create({
            accountId,
            subscriptionId,
            id,
            data: { key: id },
            tags: {},
          })
        )
      )
    );
    let result = await entity.listEntities(
      entityAssertions.list({
        accountId,
        subscriptionId,
        idPrefix: '/foo/',
      })
    );
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
        entity.createEntity(
          entityAssertions.create({
            accountId,
            subscriptionId,
            id: `${n}`,
            data: { foo: n },
            tags: {},
          })
        )
      )
    );
    let result = await entity.listEntities(
      entityAssertions.list({
        accountId,
        subscriptionId,
      }),
      { listLimit: 2 }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeDefined();
    expect(result.items[0].id).toBe(`1`);
    expect(result.items[1].id).toBe(`2`);
    result = await entity.listEntities(
      entityAssertions.list({
        accountId,
        subscriptionId,
        next: result.next,
      }),
      { listLimit: 2 }
    );
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
        entity.createEntity(
          entityAssertions.create({
            accountId,
            subscriptionId,
            id: `${n}`,
            data: { foo: n },
            tags: {},
          })
        )
      )
    );
    let result = await entity.listEntities(
      entityAssertions.list({
        accountId,
        subscriptionId,
      }),
      { listLimit: 2 }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeDefined();
    expect(result.items[0].id).toBe(`1`);
    expect(result.items[1].id).toBe(`2`);
    result = await entity.listEntities(
      entityAssertions.list({
        accountId,
        subscriptionId,
        next: result.next,
      }),
      { listLimit: 2 }
    );
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
    await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.getEntityTags(
      entityAssertions.tags.get({
        accountId,
        subscriptionId,
        id,
      })
    );
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
    await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.updateEntityTags(
      entityAssertions.tags.update({
        accountId,
        subscriptionId,
        id,
        tags: tags1,
      })
    );
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
    const integration = await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.updateEntityTags(
      entityAssertions.tags.update({
        accountId,
        subscriptionId,
        id,
        tags: tags1,
        version: integration.version,
      })
    );
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Set tags with conflicting version throws ConflictError', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual', tenant: 'contoso' };
    await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    await expect(
      entity.updateEntityTags(
        entityAssertions.tags.update({
          accountId,
          subscriptionId,
          id,
          tags: tags1,
          version: 666,
        })
      )
    ).rejects.toThrowError(RDS.ConflictError);
  }, 10000);

  test('Update single tag without version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.setEntityTag(
      entityAssertions.tags.set({
        accountId,
        subscriptionId,
        id,
        tagKey: 'level',
        tagValue: tags1.level,
      })
    );
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
    const integration = await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.setEntityTag(
      entityAssertions.tags.set({
        accountId,
        subscriptionId,
        id,
        tagKey: 'level',
        tagValue: tags1.level,
        version: integration.version,
      })
    );
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Update single tag with conflicting version throws ConflictError', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    await expect(
      entity.setEntityTag(
        entityAssertions.tags.set({
          accountId,
          subscriptionId,
          id,
          tagKey: 'level',
          tagValue: tags1.level,
          version: 666,
        })
      )
    ).rejects.toThrowError(RDS.ConflictError);
  }, 10000);

  test('Delete single tag works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.deleteEntityTag(
      entityAssertions.tags.set({
        accountId,
        subscriptionId,
        id,
        tagKey: 'level',
      })
    );
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
    const integration = await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.deleteEntityTag(
      entityAssertions.tags.set({
        accountId,
        subscriptionId,
        id,
        tagKey: 'level',
        version: integration.version,
      })
    );
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject({ billing: 'annual' });
    expect(Object.keys(result.tags).length).toBe(1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Delete single tag with conflicting version throws ConflictError', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    await expect(
      entity.deleteEntityTag(
        entityAssertions.tags.set({
          accountId,
          subscriptionId,
          id,
          tagKey: 'level',
          version: 666,
        })
      )
    ).rejects.toThrowError(RDS.ConflictError);
  }, 10000);

  test('Delete nonexisting tag works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    await entity.createEntity(
      entityAssertions.create({
        accountId,
        subscriptionId,
        id,
        data,
        tags,
      })
    );
    const result = await entity.deleteEntityTag(
      entityAssertions.tags.set({
        accountId,
        subscriptionId,
        id,
        tagKey: 'nonexisting',
      })
    );
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags);
    expect(Object.keys(result.tags).length).toBe(2);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  // @ts-ignore
  additionalTests?.(accountId, subscriptionId);
};

export default createEntityTests;
