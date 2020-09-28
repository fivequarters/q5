import { setupEnvironment, httpExpect } from './common';

const libnpm = require('libnpm');

const { getAccount } = setupEnvironment();

describe('npm', () => {
  test('is healthy', async () => {
    const account = getAccount();

    const registryPath = `localhost:3001/v1/account/${account.accountId}/subscription/${account.subscriptionId}/registry/default/npm/`;
    const registryUrl = `http://${registryPath}`;

    const registry = { [`@testscope:registry`]: registryUrl };
    const token = {
      [`//${registryPath}:token`]: account.accessToken,
    };

    /* XXX Validate the correctness of the data. */
    await libnpm.manifest('@testscope/testpkg', { ...registry, ...token });
  }, 180000);
});
