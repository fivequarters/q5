import ComponentDao from './ComponentDao';
import Connector from '../../types/Connector';
import Converter from '../../types/Converter';
import ConnectorConverter from '../../converters/ConnectorConverter';

class ConnectorDao extends ComponentDao<Connector> {
  constructor() {
    super();
    this.converter = ConnectorConverter;
    this.tableName = 'connector_table';
  }

  protected readonly converter: Converter<Connector>;
  protected readonly tableName: string;

  // If there are no unique calls needed for Connectors, then this file will remain as is.  But if a data query is
  // needed which does not make sense in the Integration context, it should be added here.
}

export default ConnectorDao;
