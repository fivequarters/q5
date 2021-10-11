import RDS, { Model } from '@5qtrs/db';
import createEntityTests from './db.entity';

describe('DB install', () => {
  createEntityTests<Model.IInstall>(RDS.DAO.install, 'install');
});
