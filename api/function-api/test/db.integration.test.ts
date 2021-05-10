import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';

describe('DB integration', () => {
  createEntityTests<Model.IIntegration>(RDS.DAO.Integration, 'integration');
});
