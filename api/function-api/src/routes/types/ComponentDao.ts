import ConnectorDao from '../daos/components/ConnectorDao';
import IntegrationDao from '../daos/components/IntegrationDao';

type ComponentDao = ConnectorDao | IntegrationDao;
export default ComponentDao;
