import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';

describe('DB connector', () => {
  createEntityTests<Model.IConnector>(RDS.DAO.Connector, 'connector');
});
