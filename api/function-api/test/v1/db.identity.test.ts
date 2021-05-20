import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';

describe('DB identity', () => {
  createEntityTests<Model.IIdentity>(RDS.DAO.Identity, 'identity');
});
