import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';
import { random } from '@5qtrs/random';
import moment from 'moment';
import httpError from 'http-errors';

const DAO = RDS.DAO.operation;

describe('DB operation', () => {
  createEntityTests<Model.IOperation>(DAO, 'operation');
});

describe('DB operation unique tests', () => {
  const accountId = `acc-0000000000000000`;
  let subscriptionId: string;
  const entityType = 'operation';

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
    const result = await DAO.createEntity(op);
    expect(result).toBeDefined();
    expect(result).toMatchObject(op);
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
    const result = await DAO.createEntity(op);
    expect(result).toBeDefined();
    expect(result).toMatchObject(op);
    const result1 = await DAO.getEntity(keys);
    expect(result1).toBeDefined();
    expect(result1).toMatchObject(op);
  }, 10000);

  test('Upsert works', async () => {
    const op = {
      accountId,
      subscriptionId,
      id: 'opn-1',
      data: { foo: 'bar' },
    };
    const result = await DAO.createEntity(op);
    expect(result).toMatchObject(op);
    const op1 = { ...op, data: { foo: 'baz' } };
    await new Promise((res) => setTimeout(res, 1000));
    const result1 = await DAO.createEntity(op1);
    expect(result1).toMatchObject(op1);
  }, 10000);
});