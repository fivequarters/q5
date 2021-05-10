import RDS, { Model } from '@5qtrs/db';
import { random } from '@5qtrs/random';
import httpError from 'http-errors';

const accountId = `acc-0000000000000000`;

describe('DB transaction', () => {
  let subscriptionId: string;

  beforeAll(async () => {
    await RDS.ensureConnection();
    subscriptionId = `sub-${random({ lengthInBytes: 16 })}`;
  });

  afterEach(async () => {
    await RDS.executeStatement(
      `delete from entity where accountId = '${accountId}' and subscriptionId = '${subscriptionId}';`
    );
  }, 5000);

  test('Commit works', async () => {
    const storage = {
      data: { foo: 'bar' },
      tags: {},
      accountId,
      subscriptionId,
      id: 'storage-1',
    };
    await RDS.inTransaction(async (daoCollection) => {
      const result1 = await daoCollection.Storage.createEntity(storage);
      expect(result1).toMatchObject(storage);
      // Calling with non-transactional DAO
      await expect(RDS.DAO.Storage.getEntity(storage)).rejects.toThrowError(new httpError.NotFound());
    });

    const result3 = await RDS.DAO.Storage.getEntity(storage);
    expect(result3).toMatchObject(storage);
  }, 1000000000);

  test('Rollback works', async () => {
    const storage = {
      accountId,
      subscriptionId,
      id: 'storage-1',
      data: { foo: 'bar' },
      tags: {},
    };
    try {
      await RDS.inTransaction(async (daoCollection) => {
        const result1 = await daoCollection.Storage.createEntity(storage);
        expect(result1).toMatchObject(storage);
        // Calling with non-transactional DAO
        await expect(RDS.DAO.Storage.getEntity(storage)).rejects.toThrowError(new httpError.NotFound());
        // Forcing a rollback bubbles the error up.
        throw 'Force Rollback';
      });
    } catch (e) {
      expect(e).toEqual('Force Rollback');
    }

    await expect(RDS.DAO.Storage.getEntity(storage)).rejects.toThrowError(new httpError.NotFound());
  }, 10000);
});
