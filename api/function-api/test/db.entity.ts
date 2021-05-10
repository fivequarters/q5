import { random } from '@5qtrs/random';
import RDS, { Model } from '@5qtrs/db';
import httpError from 'http-errors';

const createEntityTests = <T extends Model.IEntity>(DAO: Model.IEntityDao<T>, entityType: string) => {
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

    const createRequest = { accountId, subscriptionId, id, data, tags: {} };
    const response: T = await DAO.createEntity(createRequest);
    delete response.expires;
    expect(response).toStrictEqual({
      ...createRequest,
      version: 1,
      entityType,
    });

    const getRequest = { accountId, subscriptionId, id };
    const result = await DAO.getEntity(getRequest);
    delete result.expires;
    expect(result).toStrictEqual({
      ...createRequest,
      version: 1,
      entityType,
    });
  }, 10000);

  test('Get throws NotFoundError if not found', async () => {
    const id = 'slack';
    await expect(DAO.getEntity({ accountId, subscriptionId, id })).rejects.toThrowError(new httpError.NotFound());
  }, 10000);

  test('Deleting non-existing works', async () => {
    const id = 'slack';
    const result = await DAO.deleteEntity({ accountId, subscriptionId, id });
    expect(result).toBe(false);
  }, 10000);

  test('Deleting existing works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    await DAO.createEntity({ accountId, subscriptionId, id, data, tags: {} });
    const result = await DAO.deleteEntity({ accountId, subscriptionId, id });
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
    const firstResult = await DAO.createEntity({ accountId, subscriptionId, id, data, tags: {} });
    const secondResult = await DAO.updateEntity({ accountId, subscriptionId, id, data: newData, tags: {} });
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
      DAO.updateEntity({ accountId, subscriptionId, id, data, tags: {} }, { upsert: true })
    ).rejects.toThrowError(new httpError.NotFound());
  }, 10000);

  test('Updating conflicting throws ConflictError', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const result = await DAO.createEntity({ accountId, subscriptionId, id, data, tags: {} });
    await DAO.updateEntity(result); // "concurrent" update
    await expect(DAO.updateEntity(result)).rejects.toThrowError(new httpError.Conflict());
  }, 10000);

  test('Listing works', async () => {
    const records = [1, 2, 3];
    const createRequest = (n: number) => ({
      accountId,
      subscriptionId,
      id: `slack-${n}`,
      data: { foo: n },
      tags: {},
    });

    await Promise.all(records.map((n) => DAO.createEntity(createRequest(n))));
    const result = await DAO.listEntities({ accountId, subscriptionId });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    result.items.forEach((item) => delete item.expires);
    expect(result.items.length).toBe(3);
    expect(result.next).toBeUndefined();
    records.forEach((r, i) =>
      expect(result.items[i]).toStrictEqual({
        entityType,
        ...createRequest(r),
        version: 1,
      })
    );
  }, 10000);

  test('Listing by one tag works', async () => {
    const records = [1, 2, 3];
    const makeRecord: (n: number) => Model.IEntityId = (n) => ({
      accountId,
      subscriptionId,
      id: `slack-${n}`,
      data: { foo: n },
      tags: { serviceLevel: n == 2 ? 'gold' : 'silver', foo: 'bar' },
    });
    await Promise.all(records.map((n) => DAO.createEntity(makeRecord(n))));
    let result = await DAO.listEntities({ accountId, subscriptionId, tags: { serviceLevel: 'silver' } });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeUndefined();
    result.items.forEach((item) => delete item.expires);
    expect(result.items[0]).toStrictEqual({ ...makeRecord(1), version: 1, entityType });
    expect(result.items[1]).toStrictEqual({ ...makeRecord(3), version: 1, entityType });
  }, 10000);

  test('Listing by two tags works', async () => {
    const records = [1, 2, 3];
    const makeRecord: (n: number) => Model.IEntityId = (n) => ({
      accountId,
      subscriptionId,
      id: `slack-${n}`,
      data: { foo: n },
      tags: { serviceLevel: n == 2 ? 'gold' : 'silver', billing: n === 1 ? 'annual' : 'monthly' },
    });
    await Promise.all(records.map((n) => DAO.createEntity(makeRecord(n))));
    let result = await DAO.listEntities({
      accountId,
      subscriptionId,
      tags: { serviceLevel: 'silver', billing: 'monthly' },
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.next).toBeUndefined();
    result.items.forEach((item) => delete item.expires);
    expect(result.items[0]).toStrictEqual({ ...makeRecord(3), version: 1, entityType });
  }, 10000);

  test('Listing by id prefix works', async () => {
    const records = ['/foo/bar/', '/foobar/baz/', '/foo/baz/', '/baz/foo/'];
    await Promise.all(
      records.map((id) =>
        DAO.createEntity({
          accountId,
          subscriptionId,
          id,
          data: { key: id },
          tags: {},
        })
      )
    );
    let result = await DAO.listEntities({
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
        DAO.createEntity({
          accountId,
          subscriptionId,
          id: `${n}`,
          data: { foo: n },
          tags: {},
        })
      )
    );
    let result = await DAO.listEntities(
      {
        accountId,
        subscriptionId,
      },
      { listLimit: 2 }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeDefined();
    expect(result.items[0].id).toBe(`1`);
    expect(result.items[1].id).toBe(`2`);
    result = await DAO.listEntities(
      {
        accountId,
        subscriptionId,
        next: result.next,
      },
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
        DAO.createEntity({
          accountId,
          subscriptionId,
          id: `${n}`,
          data: { foo: n },
          tags: {},
        })
      )
    );
    let result = await DAO.listEntities(
      {
        accountId,
        subscriptionId,
      },
      { listLimit: 2 }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(2);
    expect(result.next).toBeDefined();
    expect(result.items[0].id).toBe(`1`);
    expect(result.items[1].id).toBe(`2`);
    result = await DAO.listEntities(
      {
        accountId,
        subscriptionId,
        next: result.next,
      },
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
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.getEntityTags({
      accountId,
      subscriptionId,
      id,
    });
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
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.updateEntityTags({
      accountId,
      subscriptionId,
      id,
      tags: tags1,
    });
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
    const integration = await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.updateEntityTags({
      accountId,
      subscriptionId,
      id,
      tags: tags1,
      version: integration.version,
    });
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
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    await expect(
      DAO.updateEntityTags({
        accountId,
        subscriptionId,
        id,
        tags: tags1,
        version: 666,
      })
    ).rejects.toThrowError(new httpError.Conflict());
  }, 10000);

  test('Update single tag without version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.setEntityTag({
      accountId,
      subscriptionId,
      id,
      tagKey: 'level',
      tagValue: tags1.level,
    });
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
    const integration = await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.setEntityTag({
      accountId,
      subscriptionId,
      id,
      tagKey: 'level',
      tagValue: tags1.level,
      version: integration.version,
    });
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
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    await expect(
      DAO.setEntityTag({
        accountId,
        subscriptionId,
        id,
        tagKey: 'level',
        tagValue: tags1.level,
        version: 666,
      })
    ).rejects.toThrowError(new httpError.Conflict());
  }, 10000);

  test('Delete single tag works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.deleteEntityTag({
      accountId,
      subscriptionId,
      id,
      tagKey: 'level',
    });
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject({ billing: 'annual' });
    expect(Object.keys(result.tags!).length).toBe(1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Delete single tag with version works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    const tags1 = { level: 'silver', billing: 'annual' };
    const integration = await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.deleteEntityTag({
      accountId,
      subscriptionId,
      id,
      tagKey: 'level',
      version: integration.version,
    });
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject({ billing: 'annual' });
    expect(Object.keys(result.tags!).length).toBe(1);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);

  test('Delete single tag with conflicting version throws ConflictError', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    await expect(
      DAO.deleteEntityTag({
        accountId,
        subscriptionId,
        id,
        tagKey: 'level',
        version: 666,
      })
    ).rejects.toThrowError(new httpError.Conflict());
  }, 10000);

  test('Delete nonexisting tag works', async () => {
    const id = 'slack';
    const data = { foo: 'bar' };
    const tags = { level: 'gold', billing: 'annual' };
    await DAO.createEntity({
      accountId,
      subscriptionId,
      id,
      data,
      tags,
    });
    const result = await DAO.deleteEntityTag({
      accountId,
      subscriptionId,
      id,
      tagKey: 'nonexisting',
    });
    expect(result).toBeDefined();
    expect(result.version).toBe(2);
    expect(result.tags).toMatchObject(tags);
    expect(Object.keys(result.tags!).length).toBe(2);
    expect(Object.keys(result).length).toBe(2);
  }, 10000);
};

export default createEntityTests;
