import FusebitRouter, { FusebitManager, Context, Next, IStorage } from '../src';
import integration from '../src/FusebitIntegrationManager';

beforeEach(() => {
  integration.clear();
});

describe('Integration', () => {
  it('validate routable contexts have correct values', async () => {
    const storage = {};
    const manager = new FusebitManager(storage as IStorage);

    const config = {
      integration: {
        slack1: {
          package: './examples/oauth-connector',
          config: {
            authority: 'https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector',
          },
        },
      },
    };

    manager.setup(undefined, undefined, config);

    const ctx: any = {};

    const slack1 = await integration.getByName(ctx, 'slack1', 'LOOKUPKEY');
    expect(slack1.sendMessage()).toBe(
      `OAUTH ${config.integration.slack1.package} => ${config.integration.slack1.config.authority}/LOOKUPKEY`
    );
  });
});
