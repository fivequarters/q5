import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';

describe('DB instance', () => {
  createEntityTests<Model.IInstance>(RDS.DAO.instance, 'instance');
});
