import ComponentDao from './ComponentDao';
import Integration from '../../types/Integration';
import Converter from '../../types/Converter';
import IntegrationConverter from '../../converters/IntegrationConverter';

class IntegrationDao extends ComponentDao<Integration> {
  constructor() {
    super();
    this.converter = IntegrationConverter;
    this.tableName = 'integration_table';
  }

  protected readonly converter: Converter<Integration>;
  protected readonly tableName: string;
}

export default IntegrationDao;
