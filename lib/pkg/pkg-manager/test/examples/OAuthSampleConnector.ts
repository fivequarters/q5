import { Context, IInstanceConnectorConfig } from '../../src';

class OAuthSampleConnector {
  public config: IInstanceConnectorConfig;
  constructor(cfg: IInstanceConnectorConfig) {
    this.config = cfg;
  }

  // The ctx is needed so that the integration can hook out auth tokens from the request.
  public async instantiate(ctx: Context, lookupKey: string) {
    return { sendMessage: () => `OAUTH ${this.config.package} => ${this.config.config.authority}/${lookupKey}` };
  }
}

module.exports = OAuthSampleConnector;
