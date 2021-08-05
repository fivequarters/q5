import Connector from './Connector';
import OAuthManager from './oauth/OAuthManager';

export default class ConnectorOauth extends Connector {
  _router = OAuthManager;
}
