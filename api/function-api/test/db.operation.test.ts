import { Model, RDS, Operation } from '@5qtrs/db';
import createEntityTests, { EntityAssertions } from './db.entity';
import { random } from '@5qtrs/random';
import moment from 'moment';

const entityAssertions: EntityAssertions<Model.IIntegration> = {
  create: (arg) => arg,
  delete: (arg) => arg,
  get: (arg) => arg,
  list: (arg) => arg,
  tags: { get: (arg) => arg, set: (arg) => arg, update: (arg) => arg },
  update: (arg) => arg,
};

const entity = new Operation();

describe('DB operation', () => {
  //Entity.createEntityTests();
  createEntityTests<Model.IOperation>(entity, entityAssertions);
});

describe('DB operation unique tests', () => {
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
  test('Create works', async () => {
    const op = {
      accountId,
      subscriptionId,
      id: 'opn-1',
      data: { foo: 'bar' },
    };
    const result = await entity.createEntity(entityAssertions.create(op));
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
    const result = await entity.createEntity(entityAssertions.create(op));
    expect(result).toBeDefined();
    expect(result).toMatchObject(op);
    expect(result.expires).toBeDefined();
    const result1 = await entity.getEntity(entityAssertions.get(keys));
    expect(result1).toBeDefined();
    expect(result1).toMatchObject(op);
    expect(result1.expires).toBeDefined();
    expect(result1.expires?.format()).toBe(result.expires?.format());
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
      expiresDuration: moment.duration(100, 'millisecond'),
    };
    const result = await entity.createEntity(entityAssertions.create(op));
    delete op.expiresDuration;
    expect(result).toMatchObject(op);
    await new Promise((r) => setTimeout(() => r(undefined), 200));
    await expect(entity.getEntity(entityAssertions.get(key))).rejects.toThrowError(RDS.NotFoundError);
  }, 10000);

  test('Upsert works', async () => {
    const op = {
      accountId,
      subscriptionId,
      id: 'opn-1',
      data: { foo: 'bar' },
    };
    const result = await entity.createEntity(entityAssertions.update(op));
    expect(result).toMatchObject(op);
    const op1 = { ...op, data: { foo: 'baz' } };
    await new Promise((res) => setTimeout(res, 1000));
    const result1 = await entity.createEntity(entityAssertions.create(op1));
    expect(result1).toMatchObject(op1);
    expect(result1.expires?.isAfter(result.expires)).toBeTruthy();
  }, 10000);
});
