import BaseComponentService from './BaseComponentService';
import RDS, { Model } from '@5qtrs/db';

class IntegrationService extends BaseComponentService<Model.IIntegration> {
  constructor() {
    super(RDS.DAO.Integration);
  }
}

export default IntegrationService;
