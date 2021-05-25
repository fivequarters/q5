import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';

describe('DB session', () => {
  createEntityTests<Model.ISession>(RDS.DAO.Session, 'session');
});
