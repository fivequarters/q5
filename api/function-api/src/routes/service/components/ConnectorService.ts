import BaseComponentService from './BaseComponentService';
import RDS, { Model } from '@5qtrs/db';

class ConnectorService extends BaseComponentService<Model.IConnector> {
  constructor() {
    super(RDS.DAO.Connector);
  }
}

export default ConnectorService;
