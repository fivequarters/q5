import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';

describe('DB storage', () => {
  createEntityTests<Model.IStorageItem>(RDS.DAO.storage, 'storage');
});
