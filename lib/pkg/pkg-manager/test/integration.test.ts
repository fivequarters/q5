import { FusebitManager, IStorage } from '../src';
import connectors from '../src/FusebitConnectorManager';

beforeEach(() => {
  connectors.clear();
});

describe('Integration Connector', () => {
  it('validate routable contexts have correct values', async () => {
    const storage = {};
    const manager = new FusebitManager(storage as IStorage);

    const config = {
      connectors: {
        slack1: {
          // From the perspective of the FusebitManager
          package: '../test/examples/OAuthSampleConnector',
          config: {
            authority: 'https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector',
          },
        },
      },
    };

    manager.setup(config, undefined, undefined);

    const ctx: any = {};

    const slack1 = connectors.getByName('slack1', () => 'LOOKUPKEY');
    const slack = await slack1(ctx);

    expect(slack.sendMessage()).toBe(
      `OAUTH ${config.connectors.slack1.package} => ${config.connectors.slack1.config.authority}/LOOKUPKEY`
    );
  });
});
